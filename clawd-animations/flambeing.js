export default {
    name: 'Flambeing',
    label: 'flambeing',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Pan
        var panGeo = new THREE.CylinderGeometry(0.25, 0.23, 0.04, 16);
        var panMat = new THREE.MeshBasicMaterial({
            color: 0x555555, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._pan = new THREE.Mesh(panGeo, panMat);
        this._pan.position.set(ox - 0.2, oy - 0.2, 0);
        this._pan.rotation.x = Math.PI * 0.5;
        scene.add(this._pan);

        // Pan handle
        var handleGeo = new THREE.BoxGeometry(0.25, 0.02, 0.03);
        var handleMat = new THREE.MeshBasicMaterial({
            color: 0x444444, transparent: true, opacity: 0
        });
        this._handle = new THREE.Mesh(handleGeo, handleMat);
        this._handle.position.set(ox - 0.2 + 0.35, oy - 0.2, 0);
        scene.add(this._handle);

        // Liquid in pan (alcohol)
        var liqGeo = new THREE.CircleGeometry(0.22, 16);
        var liqMat = new THREE.MeshBasicMaterial({
            color: 0xcc8844, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._liquid = new THREE.Mesh(liqGeo, liqMat);
        this._liquid.position.set(ox - 0.2, oy - 0.18, 0);
        scene.add(this._liquid);

        // Fire column particles (main flambe effect)
        this._fireParticles = [];
        var fireGeo = new THREE.SphereGeometry(0.025, 6, 6);
        for (var i = 0; i < 50; i++) {
            var fMat = new THREE.MeshBasicMaterial({
                color: i % 4 === 0 ? 0x4488ff : (i % 4 === 1 ? 0xff8800 : (i % 4 === 2 ? 0xffcc00 : 0xff4400)),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var fMesh = new THREE.Mesh(fireGeo, fMat);
            fMesh.visible = false;
            scene.add(fMesh);
            this._fireParticles.push({
                mesh: fMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }
        this._fireIdx = 0;

        // Charred sparkles
        this._sparkles = [];
        var sparkGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var j = 0; j < 20; j++) {
            var spMat = new THREE.MeshBasicMaterial({
                color: 0xffaa44, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spMesh = new THREE.Mesh(sparkGeo, spMat);
            spMesh.visible = false;
            scene.add(spMesh);
            this._sparkles.push({
                mesh: spMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._sparkIdx = 0;

        // Backlit glow (large sphere behind pan)
        var glowGeo = new THREE.SphereGeometry(0.5, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xff6600, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._backGlow = new THREE.Mesh(glowGeo, glowMat);
        this._backGlow.position.set(ox - 0.2, oy - 0.1, -0.2);
        scene.add(this._backGlow);

        // Fire column core glow
        var coreGeo = new THREE.CylinderGeometry(0.08, 0.15, 0.4, 8);
        var coreMat = new THREE.MeshBasicMaterial({
            color: 0xff8800, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._fireCore = new THREE.Mesh(coreGeo, coreMat);
        this._fireCore.position.set(ox - 0.2, oy + 0.02, 0);
        scene.add(this._fireCore);

        this._lastFire = 0;
    },
    _spawnFire(x, y, intensity) {
        var f = this._fireParticles[this._fireIdx % this._fireParticles.length];
        this._fireIdx++;
        f.mesh.visible = true;
        f.mesh.position.set(
            x + (Math.random() - 0.5) * 0.2,
            y,
            (Math.random() - 0.5) * 0.1
        );
        f.vx = (Math.random() - 0.5) * 0.3;
        f.vy = intensity * (1.0 + Math.random() * 1.5);
        f.vz = (Math.random() - 0.5) * 0.15;
        f.life = 0.3 + Math.random() * 0.4;
        f.maxLife = f.life;
        f.mesh.material.opacity = 0.7;
        f.mesh.scale.setScalar(0.5 + Math.random() * 0.8);
    },
    _spawnSparkle(x, y) {
        var s = this._sparkles[this._sparkIdx % this._sparkles.length];
        this._sparkIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x + (Math.random() - 0.5) * 0.3, y + Math.random() * 0.3, 0);
        s.vx = (Math.random() - 0.5) * 0.4;
        s.vy = -0.2 - Math.random() * 0.3;
        s.life = 0.5 + Math.random() * 0.5;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.8;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var panX = ox - 0.2;
        var panY = oy - 0.18;

        if (progress < 0.10) {
            // Phase 1: Pan with liquid appears
            var t = progress / 0.10;
            var ease = t * t;
            this._pan.material.opacity = ease * 0.7;
            this._handle.material.opacity = ease * 0.6;
            this._liquid.material.opacity = ease * 0.4;
            model.position.set(ox + 0.2, oy, oz);
        } else if (progress < 0.25) {
            // Phase 2: Model tilts pan toward imaginary flame
            var t2 = (progress - 0.10) / 0.15;
            this._pan.material.opacity = 0.7;
            this._handle.material.opacity = 0.6;
            this._liquid.material.opacity = 0.4 + t2 * 0.1;

            // Pan tilts
            this._pan.rotation.z = t2 * 0.15;
            this._handle.rotation.z = t2 * 0.15;
            this._liquid.rotation.z = t2 * 0.1;

            // Model leans toward pan
            model.position.set(ox + 0.2 - t2 * 0.05, oy, oz);
            model.rotation.z = -t2 * 0.06;
        } else if (progress < 0.55) {
            // Phase 3: WHOOSH - fire column erupts!
            var t3 = (progress - 0.25) / 0.30;
            var fireIntensity = Math.sin(t3 * Math.PI);

            // Pan levels out
            this._pan.rotation.z = 0.15 * (1 - t3 * 0.5);
            this._handle.rotation.z = 0.15 * (1 - t3 * 0.5);

            // Fire core visible
            this._fireCore.material.opacity = fireIntensity * 0.5;
            this._fireCore.scale.set(
                1 + fireIntensity * 0.5,
                1 + fireIntensity * 2.0,
                1 + fireIntensity * 0.5
            );
            this._fireCore.position.y = oy + 0.02 + fireIntensity * 0.15;

            // Backlit glow
            this._backGlow.material.opacity = fireIntensity * 0.35;
            this._backGlow.scale.setScalar(1 + fireIntensity * 0.8);

            // Rapid fire particles shooting upward
            if (time - this._lastFire > 0.03) {
                var numToSpawn = Math.ceil(fireIntensity * 4);
                for (var fi = 0; fi < numToSpawn; fi++) {
                    this._spawnFire(panX, panY, 0.5 + fireIntensity * 1.5);
                }
                this._lastFire = time;
            }

            // Liquid burns off
            this._liquid.material.opacity = 0.5 * (1 - t3 * 0.6);
            this._liquid.material.color.setRGB(
                0.8 + fireIntensity * 0.2,
                0.53 - t3 * 0.2,
                0.27 - t3 * 0.15
            );

            // Model recoils from dramatic flames
            model.position.set(ox + 0.2 + fireIntensity * 0.08, oy + fireIntensity * 0.03, oz);
            model.rotation.z = fireIntensity * 0.05;
        } else if (progress < 0.75) {
            // Phase 4: Fire subsides, charred sparkles settle
            var t4 = (progress - 0.55) / 0.20;
            var fadeIntensity = 1 - t4;

            // Fire diminishes
            this._fireCore.material.opacity = fadeIntensity * 0.3;
            this._fireCore.scale.set(
                1 + fadeIntensity * 0.3,
                1 + fadeIntensity * 1.0,
                1 + fadeIntensity * 0.3
            );
            this._backGlow.material.opacity = fadeIntensity * 0.2;

            // Fewer fire particles
            if (time - this._lastFire > 0.1 && fadeIntensity > 0.3) {
                this._spawnFire(panX, panY, fadeIntensity * 0.8);
                this._lastFire = time;
            }

            // Charred sparkles settle
            if (Math.random() < 0.1 + fadeIntensity * 0.1) {
                this._spawnSparkle(panX, panY + 0.2);
            }

            // Pan levels fully
            this._pan.rotation.z = 0.15 * fadeIntensity * 0.3;
            this._handle.rotation.z = 0.15 * fadeIntensity * 0.3;

            // Liquid mostly gone
            this._liquid.material.opacity = 0.2 * fadeIntensity;

            model.position.set(ox + 0.2 + fadeIntensity * 0.03, oy, oz);
            model.rotation.z = fadeIntensity * 0.02;
        } else if (progress < 0.88) {
            // Phase 5: Calm after the flame
            var t5 = (progress - 0.75) / 0.13;
            this._fireCore.material.opacity = 0;
            this._backGlow.material.opacity = 0;
            this._pan.rotation.z = 0;
            this._handle.rotation.z = 0;
            this._liquid.material.opacity = 0;

            // Occasional settling sparkle
            if (Math.random() < 0.04) {
                this._spawnSparkle(panX, panY + 0.1);
            }

            model.position.set(ox + 0.2, oy, oz);
            model.rotation.z = 0;
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.88) / 0.12;
            this._pan.material.opacity = 0.7 * (1 - t6);
            this._handle.material.opacity = 0.6 * (1 - t6);

            model.position.set(ox + 0.2 * (1 - t6), oy, oz);
            model.scale.copy(this._origScale);
        }

        // Update fire particles
        for (var pi = 0; pi < this._fireParticles.length; pi++) {
            var fp = this._fireParticles[pi];
            if (fp.life <= 0) continue;
            fp.life -= delta;
            if (fp.life <= 0) { fp.mesh.visible = false; continue; }
            fp.mesh.position.x += fp.vx * delta;
            fp.mesh.position.y += fp.vy * delta;
            fp.mesh.position.z += fp.vz * delta;
            fp.mesh.position.x += Math.sin(time * 15 + pi) * 0.003;
            var lr = fp.life / fp.maxLife;
            fp.mesh.material.opacity = lr * 0.6;
            fp.mesh.scale.setScalar(fp.mesh.scale.x * (0.98 + lr * 0.02));
        }

        // Update sparkles
        for (var si = 0; si < this._sparkles.length; si++) {
            var sp = this._sparkles[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.vy += delta * 0.3; // gravity
            var slr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = slr * 0.7;
            sp.mesh.scale.setScalar(0.5 + slr * 0.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._pan) { scene.remove(this._pan); this._pan.geometry.dispose(); this._pan.material.dispose(); }
        if (this._handle) { scene.remove(this._handle); this._handle.geometry.dispose(); this._handle.material.dispose(); }
        if (this._liquid) { scene.remove(this._liquid); this._liquid.geometry.dispose(); this._liquid.material.dispose(); }
        if (this._backGlow) { scene.remove(this._backGlow); this._backGlow.geometry.dispose(); this._backGlow.material.dispose(); }
        if (this._fireCore) { scene.remove(this._fireCore); this._fireCore.geometry.dispose(); this._fireCore.material.dispose(); }
        if (this._fireParticles) { this._fireParticles.forEach(function(f) { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); }); }
        if (this._sparkles) { this._sparkles.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._pan = this._handle = this._liquid = this._backGlow = this._fireCore = this._fireParticles = this._sparkles = null;
    }
};
