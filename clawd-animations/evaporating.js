export default {
    name: 'Evaporating',
    label: 'evaporating',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Pool of liquid (blue disc)
        var poolGeo = new THREE.CircleGeometry(0.4, 24);
        var poolMat = new THREE.MeshBasicMaterial({
            color: 0x3388dd, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._pool = new THREE.Mesh(poolGeo, poolMat);
        this._pool.position.set(ox, oy - 0.35, -0.02);
        scene.add(this._pool);

        // Heat shimmer particles (rising from edges)
        this._shimmers = [];
        var shimGeo = new THREE.PlaneGeometry(0.03, 0.06);
        for (var i = 0; i < 20; i++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0xffddaa, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
                side: THREE.DoubleSide
            });
            var shim = new THREE.Mesh(shimGeo, sMat);
            shim.visible = false;
            scene.add(shim);
            this._shimmers.push({
                mesh: shim, life: 0, maxLife: 0,
                vx: 0, vy: 0, phase: Math.random() * Math.PI * 2
            });
        }
        this._shimIdx = 0;

        // Vapor wisps (ascending mist)
        this._vapors = [];
        var vapGeo = new THREE.SphereGeometry(0.03, 6, 6);
        for (var v = 0; v < 35; v++) {
            var vMat = new THREE.MeshBasicMaterial({
                color: v % 2 === 0 ? 0xaaddff : 0xccddee,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var vap = new THREE.Mesh(vapGeo, vMat);
            vap.visible = false;
            scene.add(vap);
            this._vapors.push({
                mesh: vap, life: 0, maxLife: 0,
                vx: 0, vy: 0, baseScale: 0.5 + Math.random() * 0.5
            });
        }
        this._vapIdx = 0;

        // Dry glow
        var glowGeo = new THREE.SphereGeometry(0.35, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffeedd, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._dryGlow = new THREE.Mesh(glowGeo, glowMat);
        this._dryGlow.position.set(ox, oy, 0);
        scene.add(this._dryGlow);

        this._poolScale = 1.0;
        this._lastShim = 0;
        this._lastVap = 0;
    },
    _spawnShimmer(ox, oy, poolRadius) {
        var s = this._shimmers[this._shimIdx % this._shimmers.length];
        this._shimIdx++;
        var angle = Math.random() * Math.PI * 2;
        s.mesh.visible = true;
        s.mesh.position.set(
            ox + Math.cos(angle) * poolRadius * 0.9,
            oy - 0.30,
            0
        );
        s.vx = (Math.random() - 0.5) * 0.05;
        s.vy = 0.15 + Math.random() * 0.1;
        s.life = 0.6 + Math.random() * 0.4;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.3;
    },
    _spawnVapor(ox, oy, poolRadius) {
        var v = this._vapors[this._vapIdx % this._vapors.length];
        this._vapIdx++;
        v.mesh.visible = true;
        v.mesh.position.set(
            ox + (Math.random() - 0.5) * poolRadius * 1.5,
            oy - 0.32,
            0
        );
        v.vx = (Math.random() - 0.5) * 0.1;
        v.vy = 0.2 + Math.random() * 0.15;
        v.life = 0.8 + Math.random() * 0.6;
        v.maxLife = v.life;
        v.mesh.material.opacity = 0.35;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        var evapRate = 0;
        var poolRadius = 0.4;

        // Phase 1: Pool appears (0-10%)
        if (progress < 0.10) {
            var t = progress / 0.10;
            this._pool.material.opacity = t * 0.5;
            this._poolScale = 1.0;
            model.position.set(ox, oy, oz);
        }
        // Phase 2: Slow evaporation begins (10-30%)
        else if (progress < 0.30) {
            var t2 = (progress - 0.10) / 0.20;
            evapRate = t2 * 0.3;
            this._poolScale = 1.0 - t2 * 0.1;
            this._pool.material.opacity = 0.5;

            // Occasional shimmers
            if (time - this._lastShim > 0.3) {
                this._spawnShimmer(ox, oy, poolRadius * this._poolScale);
                this._lastShim = time;
            }
            if (time - this._lastVap > 0.5) {
                this._spawnVapor(ox, oy, poolRadius * this._poolScale);
                this._lastVap = time;
            }
        }
        // Phase 3: Accelerating evaporation (30-55%)
        else if (progress < 0.55) {
            var t3 = (progress - 0.30) / 0.25;
            evapRate = 0.3 + t3 * 0.5;
            this._poolScale = 0.9 - t3 * 0.3;
            this._pool.material.opacity = 0.5 - t3 * 0.1;

            // More shimmers and vapor
            if (time - this._lastShim > 0.15) {
                this._spawnShimmer(ox, oy, poolRadius * this._poolScale);
                this._lastShim = time;
            }
            if (time - this._lastVap > 0.12) {
                this._spawnVapor(ox, oy, poolRadius * this._poolScale);
                this._lastVap = time;
            }
        }
        // Phase 4: Pool shrinks rapidly (55-75%)
        else if (progress < 0.75) {
            var t4 = (progress - 0.55) / 0.20;
            evapRate = 0.8 + t4 * 0.2;
            this._poolScale = 0.6 - t4 * 0.45;
            this._pool.material.opacity = 0.4 * (1 - t4 * 0.5);

            // Heavy vapor
            if (time - this._lastShim > 0.1) {
                this._spawnShimmer(ox, oy, poolRadius * this._poolScale);
                this._spawnShimmer(ox, oy, poolRadius * this._poolScale);
                this._lastShim = time;
            }
            if (time - this._lastVap > 0.06) {
                this._spawnVapor(ox, oy, poolRadius * this._poolScale);
                this._lastVap = time;
            }
        }
        // Phase 5: Last drops vanish (75-88%)
        else if (progress < 0.88) {
            var t5 = (progress - 0.75) / 0.13;
            this._poolScale = Math.max(0.15 * (1 - t5), 0);
            this._pool.material.opacity = 0.2 * (1 - t5);

            // Sparse final vapors
            if (Math.random() < 0.05) {
                this._spawnVapor(ox, oy, 0.1);
            }

            // Dry glow appears
            this._dryGlow.material.opacity = t5 * 0.2;
            this._dryGlow.scale.setScalar(1 + t5 * 0.3);
        }
        // Phase 6: Clean dry glow, fade (88-100%)
        else {
            var t6 = (progress - 0.88) / 0.12;
            this._poolScale = 0;
            this._pool.material.opacity = 0;

            this._dryGlow.material.opacity = 0.2 * (1 - t6);
            this._dryGlow.scale.setScalar(1.3 + t6 * 0.3);

            model.position.set(ox, oy, oz);
            if (t6 > 0.8) {
                model.position.copy(this._origPos);
            }
        }

        // Apply pool scale
        this._pool.scale.setScalar(Math.max(this._poolScale, 0.01));

        // Model brightens as pool shrinks
        if (progress > 0.30 && progress < 0.88) {
            var brighten = Math.min((progress - 0.30) / 0.45, 1);
            model.scale.copy(this._origScale).multiplyScalar(1 + brighten * 0.05);
        } else {
            model.scale.copy(this._origScale);
        }

        // Update shimmers
        for (var si = 0; si < this._shimmers.length; si++) {
            var sh = this._shimmers[si];
            if (sh.life <= 0) continue;
            sh.life -= delta;
            if (sh.life <= 0) { sh.mesh.visible = false; continue; }
            sh.mesh.position.x += sh.vx * delta + Math.sin(time * 5 + sh.phase) * 0.003;
            sh.mesh.position.y += sh.vy * delta;
            sh.mesh.material.opacity = 0.3 * (sh.life / sh.maxLife);
            sh.mesh.scale.setScalar(0.8 + (1 - sh.life / sh.maxLife) * 0.6);
        }

        // Update vapors
        for (var vi = 0; vi < this._vapors.length; vi++) {
            var vv = this._vapors[vi];
            if (vv.life <= 0) continue;
            vv.life -= delta;
            if (vv.life <= 0) { vv.mesh.visible = false; continue; }
            vv.mesh.position.x += vv.vx * delta + Math.sin(time * 3 + vi) * 0.002;
            vv.mesh.position.y += vv.vy * delta;
            var lifeRatio = vv.life / vv.maxLife;
            vv.mesh.material.opacity = 0.35 * lifeRatio;
            vv.mesh.scale.setScalar(vv.baseScale * (1.5 - lifeRatio * 0.5));
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._pool) { scene.remove(this._pool); this._pool.geometry.dispose(); this._pool.material.dispose(); }
        if (this._shimmers) { this._shimmers.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._vapors) { this._vapors.forEach(function(v) { scene.remove(v.mesh); v.mesh.geometry.dispose(); v.mesh.material.dispose(); }); }
        if (this._dryGlow) { scene.remove(this._dryGlow); this._dryGlow.geometry.dispose(); this._dryGlow.material.dispose(); }
        this._pool = this._shimmers = this._vapors = this._dryGlow = null;
    }
};