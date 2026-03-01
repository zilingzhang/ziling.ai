export default {
    name: 'Brewing',
    label: 'brewing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Cauldron (half-sphere using hemisphere geometry)
        var cauldronGeo = new THREE.SphereGeometry(0.25, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
        var cauldronMat = new THREE.MeshBasicMaterial({
            color: 0x555555, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._cauldron = new THREE.Mesh(cauldronGeo, cauldronMat);
        this._cauldron.rotation.x = Math.PI;
        this._cauldron.position.set(ox - 0.3, oy - 0.15, 0);
        scene.add(this._cauldron);

        // Cauldron rim ring
        var rimGeo = new THREE.TorusGeometry(0.24, 0.02, 8, 24);
        var rimMat = new THREE.MeshBasicMaterial({
            color: 0x777777, transparent: true, opacity: 0
        });
        this._rim = new THREE.Mesh(rimGeo, rimMat);
        this._rim.position.set(ox - 0.3, oy - 0.15, 0);
        this._rim.rotation.x = Math.PI * 0.5;
        scene.add(this._rim);

        // Liquid surface disc
        var liquidGeo = new THREE.CircleGeometry(0.22, 20);
        var liquidMat = new THREE.MeshBasicMaterial({
            color: 0x22cc44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._liquid = new THREE.Mesh(liquidGeo, liquidMat);
        this._liquid.position.set(ox - 0.3, oy - 0.13, 0);
        scene.add(this._liquid);

        // Bubbles
        this._bubbles = [];
        var bubGeo = new THREE.SphereGeometry(0.02, 6, 6);
        for (var i = 0; i < 25; i++) {
            var bMat = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0x44ff88 : 0x8844ff,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bub = new THREE.Mesh(bubGeo, bMat);
            bub.visible = false;
            scene.add(bub);
            this._bubbles.push({
                mesh: bub, life: 0, maxLife: 0,
                vx: 0, vy: 0, startScale: 0.3
            });
        }
        this._bubIdx = 0;
        this._lastBub = 0;

        // Steam wisps
        this._steamWisps = [];
        var wispGeo = new THREE.SphereGeometry(0.04, 6, 6);
        for (var j = 0; j < 15; j++) {
            var wMat = new THREE.MeshBasicMaterial({
                color: 0xccccff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var wisp = new THREE.Mesh(wispGeo, wMat);
            wisp.visible = false;
            scene.add(wisp);
            this._steamWisps.push({
                mesh: wisp, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._wispIdx = 0;

        // Eruption glow
        var eruptGeo = new THREE.SphereGeometry(0.35, 12, 12);
        var eruptMat = new THREE.MeshBasicMaterial({
            color: 0x8844ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._eruptGlow = new THREE.Mesh(eruptGeo, eruptMat);
        this._eruptGlow.position.set(ox - 0.3, oy - 0.1, 0);
        scene.add(this._eruptGlow);

        this._colorPhase = 0;
    },
    _spawnBubble(x, y, speed) {
        var b = this._bubbles[this._bubIdx % this._bubbles.length];
        this._bubIdx++;
        b.mesh.visible = true;
        b.mesh.position.set(
            x + (Math.random() - 0.5) * 0.3,
            y,
            (Math.random() - 0.5) * 0.1
        );
        b.vx = (Math.random() - 0.5) * 0.15;
        b.vy = speed + Math.random() * 0.3;
        b.life = 0.5 + Math.random() * 0.6;
        b.maxLife = b.life;
        b.startScale = 0.3 + Math.random() * 0.5;
        b.mesh.material.opacity = 0.7;
    },
    _spawnWisp(x, y) {
        var w = this._steamWisps[this._wispIdx % this._steamWisps.length];
        this._wispIdx++;
        w.mesh.visible = true;
        w.mesh.position.set(x + (Math.random() - 0.5) * 0.15, y, 0);
        w.vx = (Math.random() - 0.5) * 0.2;
        w.vy = 0.4 + Math.random() * 0.3;
        w.life = 0.8 + Math.random() * 0.5;
        w.maxLife = w.life;
        w.mesh.material.opacity = 0.4;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var cauldronX = ox - 0.3;
        var cauldronY = oy - 0.13;

        // Color cycling for liquid
        this._colorPhase += delta * 0.8;
        var cr = 0.1 + 0.3 * Math.sin(this._colorPhase);
        var cg = 0.5 + 0.3 * Math.sin(this._colorPhase + Math.PI * 0.67);
        var cb = 0.3 + 0.4 * Math.sin(this._colorPhase + Math.PI * 1.33);
        this._liquid.material.color.setRGB(Math.max(0, cr), Math.max(0, cg), Math.max(0, cb));

        if (progress < 0.10) {
            // Phase 1: Cauldron materializes
            var t = progress / 0.10;
            var ease = t * t;
            this._cauldron.material.opacity = ease * 0.7;
            this._rim.material.opacity = ease * 0.6;
            this._liquid.material.opacity = ease * 0.4;
            this._cauldron.scale.setScalar(0.5 + ease * 0.5);
            this._rim.scale.setScalar(0.5 + ease * 0.5);
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.40) {
            // Phase 2: Slow bubbles, color shifting
            var t2 = (progress - 0.10) / 0.30;
            this._cauldron.material.opacity = 0.7;
            this._rim.material.opacity = 0.6;
            this._liquid.material.opacity = 0.4 + t2 * 0.2;

            // Slow bubble spawn
            if (time - this._lastBub > 0.25) {
                this._spawnBubble(cauldronX, cauldronY, 0.3 + t2 * 0.2);
                this._lastBub = time;
            }

            // Occasional steam
            if (Math.random() < 0.02) {
                this._spawnWisp(cauldronX, cauldronY + 0.05);
            }

            // Liquid surface wobbles
            this._liquid.position.y = cauldronY + Math.sin(time * 3) * 0.01;

            model.position.set(ox + 0.15, oy + Math.sin(time * 1.5) * 0.01, oz);
        } else if (progress < 0.70) {
            // Phase 3: Vigorous bubbling, model stirs (rotates)
            var t3 = (progress - 0.40) / 0.30;
            this._liquid.material.opacity = 0.6 + Math.sin(time * 4) * 0.1;

            // Faster bubbles
            if (time - this._lastBub > 0.08) {
                this._spawnBubble(cauldronX, cauldronY, 0.5 + t3 * 0.4);
                if (t3 > 0.5) {
                    this._spawnBubble(cauldronX, cauldronY, 0.6);
                }
                this._lastBub = time;
            }

            // Steam wisps
            if (Math.random() < 0.06 + t3 * 0.06) {
                this._spawnWisp(cauldronX, cauldronY + 0.05);
            }

            // Model stirs - orbits around cauldron
            var stirAngle = time * 2.5;
            var stirRadius = 0.12;
            model.position.set(
                ox + 0.15 + Math.cos(stirAngle) * stirRadius * 0.3,
                oy + Math.sin(stirAngle) * 0.03,
                oz
            );
            model.rotation.z = Math.sin(stirAngle) * 0.08;

            // Liquid wobbles more
            this._liquid.position.y = cauldronY + Math.sin(time * 5) * 0.02;
            this._liquid.scale.setScalar(1 + Math.sin(time * 4) * 0.04);
        } else if (progress < 0.85) {
            // Phase 4: Potion erupts with glow burst
            var t4 = (progress - 0.70) / 0.15;
            var eruptEase = Math.sin(t4 * Math.PI);

            // Eruption glow
            this._eruptGlow.material.opacity = eruptEase * 0.5;
            this._eruptGlow.scale.setScalar(1 + eruptEase * 1.5);

            // Rapid bubbles upward
            if (time - this._lastBub > 0.04) {
                this._spawnBubble(cauldronX, cauldronY, 1.2 + t4 * 0.8);
                this._spawnBubble(cauldronX, cauldronY, 1.0);
                this._lastBub = time;
            }

            // Lots of steam
            if (Math.random() < 0.15) {
                this._spawnWisp(cauldronX, cauldronY + 0.1);
            }

            // Color flash on liquid
            this._liquid.material.opacity = 0.7 + eruptEase * 0.3;

            // Model recoils slightly
            model.position.set(ox + 0.15 + t4 * 0.05, oy + eruptEase * 0.05, oz);
            model.rotation.z = -eruptEase * 0.06;
        } else {
            // Phase 5: Settle
            var t5 = (progress - 0.85) / 0.15;
            this._cauldron.material.opacity = 0.7 * (1 - t5);
            this._rim.material.opacity = 0.6 * (1 - t5);
            this._liquid.material.opacity = 0.7 * (1 - t5);
            this._eruptGlow.material.opacity = 0.5 * (1 - t5);
            this._eruptGlow.scale.setScalar(2.5 + t5 * 0.5);

            model.position.set(
                ox + 0.15 * (1 - t5),
                oy,
                oz
            );
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update bubbles
        for (var bi = 0; bi < this._bubbles.length; bi++) {
            var bb = this._bubbles[bi];
            if (bb.life <= 0) continue;
            bb.life -= delta;
            if (bb.life <= 0) { bb.mesh.visible = false; continue; }
            bb.mesh.position.x += bb.vx * delta;
            bb.mesh.position.y += bb.vy * delta;
            bb.mesh.position.x += Math.sin(time * 8 + bi) * 0.002;
            var lr = bb.life / bb.maxLife;
            bb.mesh.material.opacity = lr * 0.7;
            bb.mesh.scale.setScalar(bb.startScale + (1 - lr) * 0.3);
        }

        // Update steam wisps
        for (var wi = 0; wi < this._steamWisps.length; wi++) {
            var ww = this._steamWisps[wi];
            if (ww.life <= 0) continue;
            ww.life -= delta;
            if (ww.life <= 0) { ww.mesh.visible = false; continue; }
            ww.mesh.position.x += ww.vx * delta;
            ww.mesh.position.y += ww.vy * delta;
            ww.mesh.position.x += Math.sin(time * 3 + wi * 2) * 0.003;
            var wlr = ww.life / ww.maxLife;
            ww.mesh.material.opacity = wlr * 0.3;
            ww.mesh.scale.setScalar(0.8 + (1 - wlr) * 1.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._cauldron) { scene.remove(this._cauldron); this._cauldron.geometry.dispose(); this._cauldron.material.dispose(); }
        if (this._rim) { scene.remove(this._rim); this._rim.geometry.dispose(); this._rim.material.dispose(); }
        if (this._liquid) { scene.remove(this._liquid); this._liquid.geometry.dispose(); this._liquid.material.dispose(); }
        if (this._eruptGlow) { scene.remove(this._eruptGlow); this._eruptGlow.geometry.dispose(); this._eruptGlow.material.dispose(); }
        if (this._bubbles) { this._bubbles.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); }); }
        if (this._steamWisps) { this._steamWisps.forEach(function(w) { scene.remove(w.mesh); w.mesh.geometry.dispose(); w.mesh.material.dispose(); }); }
        this._cauldron = this._rim = this._liquid = this._eruptGlow = this._bubbles = this._steamWisps = null;
    }
};
