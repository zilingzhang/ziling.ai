export default {
    name: 'Doing',
    label: 'doing',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Tool shapes that cycle (wrench = L-shape, hammer = T-shape, pen = line)
        this._tools = [];
        // Wrench: two boxes forming L
        var wrenchGeo1 = new THREE.BoxGeometry(0.15, 0.025, 0.015);
        var wrenchGeo2 = new THREE.BoxGeometry(0.025, 0.08, 0.015);
        var wrenchMat1 = new THREE.MeshBasicMaterial({ color: 0x44cc44, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
        var wrenchMat2 = new THREE.MeshBasicMaterial({ color: 0x44cc44, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
        var w1 = new THREE.Mesh(wrenchGeo1, wrenchMat1);
        var w2 = new THREE.Mesh(wrenchGeo2, wrenchMat2);
        w1.position.set(ox + 0.25, oy + 0.15, 0.02);
        w2.position.set(ox + 0.32, oy + 0.18, 0.02);
        scene.add(w1); scene.add(w2);
        this._tools.push({ parts: [w1, w2], active: false });

        // Hammer: T-shape
        var hammerHead = new THREE.BoxGeometry(0.1, 0.035, 0.02);
        var hammerHandle = new THREE.BoxGeometry(0.02, 0.12, 0.015);
        var hhMat = new THREE.MeshBasicMaterial({ color: 0x55dd55, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
        var hseMat = new THREE.MeshBasicMaterial({ color: 0x55dd55, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
        var hh = new THREE.Mesh(hammerHead, hhMat);
        var hse = new THREE.Mesh(hammerHandle, hseMat);
        hh.position.set(ox + 0.25, oy + 0.2, 0.02);
        hse.position.set(ox + 0.25, oy + 0.12, 0.02);
        scene.add(hh); scene.add(hse);
        this._tools.push({ parts: [hh, hse], active: false });

        // Pen: thin line
        var penGeo = new THREE.BoxGeometry(0.015, 0.15, 0.01);
        var penMat = new THREE.MeshBasicMaterial({ color: 0x66ee66, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
        var pen = new THREE.Mesh(penGeo, penMat);
        pen.position.set(ox + 0.25, oy + 0.15, 0.02);
        pen.rotation.z = 0.3;
        scene.add(pen);
        this._tools.push({ parts: [pen], active: false });

        // Work product particles (accumulating done pile)
        this._products = [];
        var prodGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        for (var i = 0; i < 20; i++) {
            var pMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0x44cc44 : (i % 3 === 1 ? 0x33bb33 : 0x55ee55),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var prod = new THREE.Mesh(prodGeo, pMat);
            prod.visible = false;
            scene.add(prod);
            this._products.push({
                mesh: prod,
                placed: false,
                targetX: ox - 0.3 + (i % 5) * 0.06,
                targetY: oy - 0.35 + Math.floor(i / 5) * 0.06
            });
        }

        // Action sparkles
        this._sparkles = [];
        var spkGeo = new THREE.SphereGeometry(0.012, 4, 4);
        for (var j = 0; j < 20; j++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: j % 2 === 0 ? 0x88ff88 : 0xccffcc,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spk = new THREE.Mesh(spkGeo, sMat);
            spk.visible = false;
            scene.add(spk);
            this._sparkles.push({
                mesh: spk, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._spkIdx = 0;

        // Done pile glow
        var doneGeo = new THREE.SphereGeometry(0.2, 10, 10);
        var doneMat = new THREE.MeshBasicMaterial({
            color: 0x44cc44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._doneGlow = new THREE.Mesh(doneGeo, doneMat);
        this._doneGlow.position.set(ox - 0.2, oy - 0.3, 0);
        scene.add(this._doneGlow);

        this._currentTool = 0;
        this._lastToolSwitch = 0;
        this._producedCount = 0;
        this._lastProduce = 0;
    },
    _spawnSparkle(x, y) {
        var s = this._sparkles[this._spkIdx % this._sparkles.length];
        this._spkIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x, y, 0.03);
        var angle = Math.random() * Math.PI * 2;
        s.vx = Math.cos(angle) * (0.5 + Math.random() * 0.5);
        s.vy = Math.sin(angle) * (0.5 + Math.random() * 0.5);
        s.life = 0.3 + Math.random() * 0.2;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.7;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        // Cycle tools every ~1.5s
        var toolIdx = Math.floor(time / 1.5) % 3;
        if (toolIdx !== this._currentTool) {
            this._currentTool = toolIdx;
        }

        // Show only active tool
        for (var ti = 0; ti < this._tools.length; ti++) {
            var isActive = ti === this._currentTool && progress > 0.05 && progress < 0.85;
            for (var pi = 0; pi < this._tools[ti].parts.length; pi++) {
                this._tools[ti].parts[pi].material.opacity = isActive ? 0.6 : 0;
                this._tools[ti].parts[pi].visible = isActive;
            }
        }

        if (progress < 0.05) {
            // Phase 1: Model activates
            var t = progress / 0.05;
            model.position.set(ox, oy, oz);
            model.scale.copy(this._origScale).multiplyScalar(0.9 + t * 0.1);
        } else if (progress < 0.80) {
            // Phase 2: Constant productive motion
            var t2 = (progress - 0.05) / 0.75;

            // Model in constant motion
            var motionX = Math.sin(time * 5) * 0.04;
            var motionY = Math.cos(time * 3.5) * 0.02;
            model.position.set(ox + motionX, oy + motionY, oz);
            model.rotation.z = Math.sin(time * 6) * 0.05;

            // Active tool follows model with work motion
            var tool = this._tools[this._currentTool];
            for (var tp = 0; tp < tool.parts.length; tp++) {
                tool.parts[tp].position.x = ox + 0.18 + motionX;
                tool.parts[tp].position.y = oy + 0.1 + motionY + Math.sin(time * 8) * 0.03;
                tool.parts[tp].material.opacity = 0.5 + Math.sin(time * 6) * 0.2;
            }

            // Produce work products periodically
            if (time - this._lastProduce > 0.5 && this._producedCount < 20) {
                var prod = this._products[this._producedCount];
                prod.mesh.visible = true;
                prod.mesh.position.set(ox + 0.15, oy, 0);
                prod.placed = true;
                this._producedCount++;
                this._lastProduce = time;
                this._spawnSparkle(ox + 0.15, oy);
            }

            // Animate placed products toward done pile
            for (var pri = 0; pri < this._producedCount; pri++) {
                var pr = this._products[pri];
                if (!pr.placed) continue;
                pr.mesh.position.x += (pr.targetX - pr.mesh.position.x) * delta * 3;
                pr.mesh.position.y += (pr.targetY - pr.mesh.position.y) * delta * 3;
                pr.mesh.material.opacity = 0.6;
                pr.mesh.rotation.z += delta;
            }

            // Done pile glow grows
            this._doneGlow.material.opacity = Math.min(this._producedCount / 20, 1) * 0.2;
            this._doneGlow.scale.setScalar(0.5 + (this._producedCount / 20) * 1.0);

            // Action sparkles
            if (Math.random() < 0.1) {
                this._spawnSparkle(ox + motionX + 0.15, oy + motionY);
            }
        } else {
            // Phase 3: Settle, done pile highlights
            var t3 = (progress - 0.80) / 0.20;

            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            // Products fade
            for (var fp = 0; fp < this._products.length; fp++) {
                if (this._products[fp].mesh.visible) {
                    this._products[fp].mesh.material.opacity = 0.6 * (1 - t3);
                }
            }

            this._doneGlow.material.opacity = 0.2 * (1 - t3);
        }

        // Update sparkles
        for (var si = 0; si < this._sparkles.length; si++) {
            var sp = this._sparkles[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            var lr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = lr * 0.6;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._tools) {
            this._tools.forEach(function(t) {
                t.parts.forEach(function(p) { scene.remove(p); p.geometry.dispose(); p.material.dispose(); });
            });
        }
        if (this._products) { this._products.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        if (this._sparkles) { this._sparkles.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._doneGlow) { scene.remove(this._doneGlow); this._doneGlow.geometry.dispose(); this._doneGlow.material.dispose(); }
        this._tools = this._products = this._sparkles = this._doneGlow = null;
    }
};
