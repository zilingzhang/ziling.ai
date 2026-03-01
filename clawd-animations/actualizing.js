export default {
    name: 'Actualizing',
    label: 'actualizing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Ghost/dream wireframe shape above (icosahedron)
        var dreamGeo = new THREE.IcosahedronGeometry(0.2, 1);
        var dreamMat = new THREE.MeshBasicMaterial({
            color: 0x6688ff, transparent: true, opacity: 0,
            wireframe: true, depthWrite: false
        });
        this._dreamShape = new THREE.Mesh(dreamGeo, dreamMat);
        this._dreamShape.position.set(ox, oy + 0.5, 0);
        scene.add(this._dreamShape);

        // Solid reality shape below (same geometry, solid)
        var solidGeo = new THREE.IcosahedronGeometry(0.2, 1);
        var solidMat = new THREE.MeshBasicMaterial({
            color: 0xffcc44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._solidShape = new THREE.Mesh(solidGeo, solidMat);
        this._solidShape.position.set(ox, oy - 0.2, 0);
        this._solidShape.scale.setScalar(0.01);
        scene.add(this._solidShape);

        // Descending dream particles (wireframe to solid transition)
        this._dreamParticles = [];
        var dpGeo = new THREE.SphereGeometry(0.02, 4, 4);
        for (var i = 0; i < 35; i++) {
            var dpMat = new THREE.MeshBasicMaterial({
                color: i < 18 ? 0x6688ff : 0xffcc44,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var dp = new THREE.Mesh(dpGeo, dpMat);
            dp.visible = false;
            scene.add(dp);
            this._dreamParticles.push({
                mesh: dp, life: 0, maxLife: 0,
                vx: 0, vy: 0,
                startX: 0, startY: 0,
                solidifying: i >= 18
            });
        }
        this._dpIdx = 0;

        // Materialization glow ring
        var ringGeo = new THREE.TorusGeometry(0.25, 0.02, 8, 24);
        var ringMat = new THREE.MeshBasicMaterial({
            color: 0xffaa44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._matRing = new THREE.Mesh(ringGeo, ringMat);
        this._matRing.position.set(ox, oy + 0.1, 0);
        scene.add(this._matRing);

        // Achievement aura
        var auraGeo = new THREE.SphereGeometry(0.4, 16, 16);
        var auraMat = new THREE.MeshBasicMaterial({
            color: 0xffdd66, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._aura = new THREE.Mesh(auraGeo, auraMat);
        this._aura.position.set(ox, oy, 0);
        scene.add(this._aura);

        // Wireframe fill lines (horizontal bars that fill in the wireframe)
        this._fillBars = [];
        var barGeo = new THREE.BoxGeometry(0.35, 0.008, 0.01);
        for (var j = 0; j < 8; j++) {
            var barMat = new THREE.MeshBasicMaterial({
                color: 0xddaa33, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bar = new THREE.Mesh(barGeo, barMat);
            bar.position.set(ox, oy - 0.35 + j * 0.05, 0.02);
            bar.scale.x = 0;
            bar.visible = false;
            scene.add(bar);
            this._fillBars.push({ mesh: bar, filled: false });
        }
    },
    _spawnDreamParticle(x, y, goDown) {
        var dp = this._dreamParticles[this._dpIdx % this._dreamParticles.length];
        this._dpIdx++;
        dp.mesh.visible = true;
        dp.mesh.position.set(x + (Math.random() - 0.5) * 0.2, y, 0);
        dp.startX = dp.mesh.position.x;
        dp.startY = y;
        dp.vx = (Math.random() - 0.5) * 0.3;
        dp.vy = goDown ? -(0.3 + Math.random() * 0.5) : (Math.random() - 0.5) * 0.2;
        dp.life = 1.0 + Math.random() * 0.5;
        dp.maxLife = dp.life;
        dp.mesh.material.opacity = 0.7;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.10) {
            // Phase 1: Dream shape appears above as wireframe
            var t = progress / 0.10;
            this._dreamShape.material.opacity = t * 0.6;
            this._dreamShape.rotation.y = time * 0.5;
            this._dreamShape.rotation.x = time * 0.3;
            this._dreamShape.scale.setScalar(0.5 + t * 0.5);

            model.position.set(ox, oy, oz);
        } else if (progress < 0.50) {
            // Phase 2: Dream particles descend, begin solidifying
            var t2 = (progress - 0.10) / 0.40;
            this._dreamShape.material.opacity = 0.6 - t2 * 0.3;
            this._dreamShape.rotation.y = time * 0.5;
            this._dreamShape.rotation.x = time * 0.3;
            this._dreamShape.scale.setScalar(1.0 - t2 * 0.3);

            // Spawn descending particles
            if (Math.random() < 0.15) {
                this._spawnDreamParticle(ox, oy + 0.5, true);
            }

            // Solid shape starts to grow
            this._solidShape.material.opacity = t2 * 0.4;
            this._solidShape.scale.setScalar(t2 * 0.6);
            this._solidShape.rotation.y = time * 0.3;

            // Materialization ring pulses
            this._matRing.material.opacity = 0.2 + Math.sin(time * 4) * 0.1;
            this._matRing.rotation.x = Math.PI * 0.5;
            this._matRing.scale.setScalar(1 + Math.sin(time * 3) * 0.1);
            this._matRing.position.y = oy + 0.5 - t2 * 0.4;

            // Color transition: blue particles become gold as they descend
            model.position.set(ox, oy + Math.sin(time * 2) * 0.01, oz);
        } else if (progress < 0.80) {
            // Phase 3: Wireframe fills in, reality crystallizes
            var t3 = (progress - 0.50) / 0.30;
            this._dreamShape.material.opacity = 0.3 * (1 - t3);
            this._dreamShape.rotation.y = time * 0.5;
            this._dreamShape.scale.setScalar(0.7 * (1 - t3));

            // Solid shape fully materializes
            this._solidShape.material.opacity = 0.4 + t3 * 0.5;
            this._solidShape.scale.setScalar(0.6 + t3 * 0.4);
            this._solidShape.rotation.y = time * 0.3;
            // Color shift from blue-tinted to golden
            var r = 0.4 + t3 * 0.6;
            var g = 0.5 + t3 * 0.3;
            var b = 0.3 - t3 * 0.1;
            this._solidShape.material.color.setRGB(r, g, Math.max(0, b));

            // Fill bars animate
            for (var i = 0; i < this._fillBars.length; i++) {
                var fillDelay = i * 0.1;
                var fillProg = Math.max(0, t3 - fillDelay) / (1 - fillDelay);
                this._fillBars[i].mesh.visible = fillProg > 0;
                this._fillBars[i].mesh.scale.x = Math.min(fillProg * 2, 1);
                this._fillBars[i].mesh.material.opacity = Math.min(fillProg, 0.5);
            }

            // More particles
            if (Math.random() < 0.1) {
                this._spawnDreamParticle(ox, oy + 0.3, true);
            }

            this._matRing.material.opacity = 0.3 + t3 * 0.2;
            this._matRing.position.y = oy + 0.1;
            this._matRing.scale.setScalar(1 + t3 * 0.3);

            model.position.set(ox, oy + Math.sin(time * 2) * 0.01, oz);
        } else if (progress < 0.92) {
            // Phase 4: Achievement aura, potential becomes actual
            var t4 = (progress - 0.80) / 0.12;
            var auraEase = Math.sin(t4 * Math.PI);

            this._aura.material.opacity = auraEase * 0.35;
            this._aura.scale.setScalar(1 + auraEase * 1.5);

            this._solidShape.material.opacity = 0.9 - t4 * 0.3;
            this._solidShape.scale.setScalar(1.0 + auraEase * 0.2);
            this._solidShape.material.color.setHex(0xffdd44);

            this._matRing.material.opacity = 0.5 * (1 - t4);
            this._dreamShape.material.opacity = 0;

            for (var k = 0; k < this._fillBars.length; k++) {
                this._fillBars[k].mesh.material.opacity = 0.5 * (1 - t4);
            }

            model.position.set(ox, oy + auraEase * 0.03, oz);
        } else {
            // Phase 5: Settle
            var t5 = (progress - 0.92) / 0.08;
            this._aura.material.opacity = 0.35 * (1 - t5);
            this._solidShape.material.opacity = 0.6 * (1 - t5);
            this._matRing.material.opacity = 0;
            for (var m = 0; m < this._fillBars.length; m++) {
                this._fillBars[m].mesh.material.opacity *= 0.9;
            }
            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update particles
        for (var pi = 0; pi < this._dreamParticles.length; pi++) {
            var p = this._dreamParticles[pi];
            if (p.life <= 0) continue;
            p.life -= delta;
            if (p.life <= 0) { p.mesh.visible = false; continue; }
            p.mesh.position.x += p.vx * delta;
            p.mesh.position.y += p.vy * delta;
            var lr = p.life / p.maxLife;
            // Particles solidify (increase opacity) as they descend
            var descended = 1 - (p.mesh.position.y - (oy - 0.3)) / 0.8;
            var solidFactor = Math.max(0, Math.min(1, descended));
            p.mesh.material.opacity = lr * (0.3 + solidFactor * 0.5);
            // Color transition
            var cr = 0.4 + solidFactor * 0.6;
            var cg = 0.5 + solidFactor * 0.3;
            var cb = 1.0 - solidFactor * 0.7;
            p.mesh.material.color.setRGB(cr, cg, Math.max(0, cb));
            p.mesh.scale.setScalar(0.5 + solidFactor * 0.8);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._dreamShape) { scene.remove(this._dreamShape); this._dreamShape.geometry.dispose(); this._dreamShape.material.dispose(); }
        if (this._solidShape) { scene.remove(this._solidShape); this._solidShape.geometry.dispose(); this._solidShape.material.dispose(); }
        if (this._matRing) { scene.remove(this._matRing); this._matRing.geometry.dispose(); this._matRing.material.dispose(); }
        if (this._aura) { scene.remove(this._aura); this._aura.geometry.dispose(); this._aura.material.dispose(); }
        if (this._dreamParticles) { this._dreamParticles.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        if (this._fillBars) { this._fillBars.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); }); }
        this._dreamShape = this._solidShape = this._matRing = this._aura = this._dreamParticles = this._fillBars = null;
    }
};
