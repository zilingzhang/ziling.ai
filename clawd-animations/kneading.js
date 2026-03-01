export default {
    name: 'Kneading',
    label: 'kneading',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Dough blob (sphere)
        var doughGeo = new THREE.SphereGeometry(0.15, 12, 12);
        var doughMat = new THREE.MeshBasicMaterial({
            color: 0xf5deb3, transparent: true, opacity: 0
        });
        this._dough = new THREE.Mesh(doughGeo, doughMat);
        this._dough.position.set(ox - 0.2, oy - 0.22, 0);
        scene.add(this._dough);

        // Counter surface
        var counterGeo = new THREE.BoxGeometry(0.6, 0.025, 0.3);
        var counterMat = new THREE.MeshBasicMaterial({
            color: 0xccaa88, transparent: true, opacity: 0
        });
        this._counter = new THREE.Mesh(counterGeo, counterMat);
        this._counter.position.set(ox - 0.2, oy - 0.32, 0);
        scene.add(this._counter);

        // Flour particles (white, small, puff on each push)
        this._flour = [];
        var flourGeo = new THREE.SphereGeometry(0.018, 4, 4);
        for (var i = 0; i < 20; i++) {
            var fMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var fMesh = new THREE.Mesh(flourGeo, fMat);
            fMesh.visible = false;
            scene.add(fMesh);
            this._flour.push({
                mesh: fMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }
        this._flourIdx = 0;

        // Ready glow (appears at end when dough is perfect)
        var glowGeo = new THREE.SphereGeometry(0.2, 10, 10);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffdd88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._readyGlow = new THREE.Mesh(glowGeo, glowMat);
        this._readyGlow.position.set(ox - 0.2, oy - 0.2, 0);
        scene.add(this._readyGlow);

        this._pushCount = 0;
        this._lastPush = 0;
        this._doughSmoothness = 0; // 0 = rough, 1 = smooth/elastic
    },
    _puffFlour(x, y) {
        for (var i = 0; i < 3; i++) {
            var f = this._flour[this._flourIdx % this._flour.length];
            this._flourIdx++;
            f.mesh.visible = true;
            f.mesh.position.set(
                x + (Math.random() - 0.5) * 0.2,
                y,
                (Math.random() - 0.5) * 0.1
            );
            var angle = -Math.PI * 0.3 + Math.random() * Math.PI * 1.6;
            var spd = 0.5 + Math.random() * 0.5;
            f.vx = Math.cos(angle) * spd;
            f.vy = Math.abs(Math.sin(angle)) * spd + 0.2;
            f.vz = (Math.random() - 0.5) * 0.3;
            f.life = 0.4 + Math.random() * 0.4;
            f.maxLife = f.life;
            f.mesh.material.opacity = 0.5;
            f.mesh.scale.setScalar(0.5 + Math.random() * 0.8);
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var doughX = ox - 0.2;
        var doughBaseY = oy - 0.22;

        // Dough smoothness increases over time
        this._doughSmoothness = Math.min(1, progress / 0.85);

        if (progress < 0.08) {
            // Phase 1: Dough and counter appear
            var t = progress / 0.08;
            var ease = t * t;
            this._dough.material.opacity = ease * 0.85;
            this._counter.material.opacity = ease * 0.5;
            model.position.set(ox + 0.1, oy, oz);
        } else if (progress < 0.70) {
            // Phase 2: Rhythmic push-squash cycle with flour puffs
            var t2 = (progress - 0.08) / 0.62;
            this._dough.material.opacity = 0.85;
            this._counter.material.opacity = 0.5;

            // Kneading rhythm
            var kneadCycle = (time * 2.0) % 1.0;
            var squashAmount;
            var stretchAmount;

            if (kneadCycle < 0.25) {
                // Push down phase
                var pushT = kneadCycle / 0.25;
                squashAmount = pushT * 0.4 * (1 - this._doughSmoothness * 0.3);
                stretchAmount = pushT * 0.3 * (1 - this._doughSmoothness * 0.3);

                // Model pushes down
                model.position.set(ox + 0.1, oy - pushT * 0.06, oz);
                model.rotation.z = -pushT * 0.08;

                // Flour puff at contact
                if (pushT > 0.8 && time - this._lastPush > 0.4) {
                    this._puffFlour(doughX, doughBaseY);
                    this._pushCount++;
                    this._lastPush = time;
                }
            } else if (kneadCycle < 0.5) {
                // Hold/fold phase
                var holdT = (kneadCycle - 0.25) / 0.25;
                squashAmount = 0.4 * (1 - holdT * 0.5) * (1 - this._doughSmoothness * 0.3);
                stretchAmount = 0.3 * (1 - holdT * 0.3) * (1 - this._doughSmoothness * 0.3);

                model.position.set(ox + 0.1, oy - 0.06 + holdT * 0.02, oz);
                model.rotation.z = -0.08 + holdT * 0.04;
            } else if (kneadCycle < 0.75) {
                // Pull/stretch phase
                var pullT = (kneadCycle - 0.5) / 0.25;
                squashAmount = 0.2 * (1 - pullT) * (1 - this._doughSmoothness * 0.3);
                stretchAmount = (0.2 + pullT * 0.15) * (1 - this._doughSmoothness * 0.3);

                model.position.set(ox + 0.1, oy - 0.04 + pullT * 0.04, oz);
                model.rotation.z = -0.04 + pullT * 0.04;
            } else {
                // Release/reset
                var relT = (kneadCycle - 0.75) / 0.25;
                squashAmount = 0;
                stretchAmount = 0.15 * (1 - relT) * (1 - this._doughSmoothness * 0.3);

                model.position.set(ox + 0.1, oy, oz);
                model.rotation.z = 0;
            }

            // Apply squash/stretch to dough
            this._dough.scale.set(
                1 + stretchAmount,
                1 - squashAmount,
                1 + stretchAmount * 0.5
            );
            this._dough.position.y = doughBaseY + squashAmount * 0.05;

            // Dough color transitions: rough beige to smooth cream
            var smooth = this._doughSmoothness;
            this._dough.material.color.setRGB(
                0.96 - smooth * 0.05,
                0.87 + smooth * 0.05,
                0.70 + smooth * 0.1
            );

        } else if (progress < 0.88) {
            // Phase 3: Dough becomes smooth/elastic, fewer flour puffs
            var t3 = (progress - 0.70) / 0.18;

            // Gentler kneading
            var gentleCycle = (time * 1.5) % 1.0;
            var gentleSquash = 0;
            if (gentleCycle < 0.3) {
                gentleSquash = Math.sin(gentleCycle / 0.3 * Math.PI) * 0.1;
                if (gentleCycle > 0.2 && time - this._lastPush > 0.6) {
                    // Occasional light flour puff
                    if (Math.random() < 0.3) {
                        this._puffFlour(doughX, doughBaseY);
                    }
                    this._lastPush = time;
                }
            }

            this._dough.scale.set(
                1 + gentleSquash * 0.3,
                1 - gentleSquash,
                1 + gentleSquash * 0.2
            );
            this._dough.position.y = doughBaseY + gentleSquash * 0.02;

            // Dough looks smoother, rounder
            this._dough.material.color.setRGB(0.91, 0.92, 0.80);

            // Model gentle motion
            model.position.set(ox + 0.1, oy + Math.sin(time * 1.5) * 0.015, oz);
            model.rotation.z = Math.sin(time * 1.5) * 0.02;
        } else {
            // Phase 4: Rest, dough glows ready
            var t4 = (progress - 0.88) / 0.12;

            // Dough settles to perfect sphere
            this._dough.scale.set(
                1 + Math.sin(time * 2) * 0.02,
                1 + Math.sin(time * 2 + Math.PI) * 0.02,
                1 + Math.sin(time * 2 + Math.PI * 0.5) * 0.02
            );

            // Ready glow
            var glowPulse = 0.5 + Math.sin(time * 3) * 0.15;
            this._readyGlow.material.opacity = (t4 < 0.5 ? t4 * 2 : 1) * 0.2 * glowPulse;
            this._readyGlow.scale.setScalar(1 + Math.sin(time * 3) * 0.1);

            // Fade everything at very end
            if (t4 > 0.6) {
                var fadeT = (t4 - 0.6) / 0.4;
                this._dough.material.opacity = 0.85 * (1 - fadeT);
                this._counter.material.opacity = 0.5 * (1 - fadeT);
                this._readyGlow.material.opacity *= (1 - fadeT);
            }

            model.position.set(ox + 0.1 * (1 - t4), oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update flour particles
        for (var fi = 0; fi < this._flour.length; fi++) {
            var ff = this._flour[fi];
            if (ff.life <= 0) continue;
            ff.life -= delta;
            if (ff.life <= 0) { ff.mesh.visible = false; continue; }
            ff.mesh.position.x += ff.vx * delta;
            ff.mesh.position.y += ff.vy * delta;
            ff.mesh.position.z += ff.vz * delta;
            ff.vy -= 1.5 * delta; // light gravity
            var lr = ff.life / ff.maxLife;
            ff.mesh.material.opacity = lr * 0.4;
            ff.mesh.scale.setScalar((0.5 + (1 - lr) * 0.5) * ff.mesh.scale.x / ff.mesh.scale.x);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._dough) { scene.remove(this._dough); this._dough.geometry.dispose(); this._dough.material.dispose(); }
        if (this._counter) { scene.remove(this._counter); this._counter.geometry.dispose(); this._counter.material.dispose(); }
        if (this._readyGlow) { scene.remove(this._readyGlow); this._readyGlow.geometry.dispose(); this._readyGlow.material.dispose(); }
        if (this._flour) { this._flour.forEach(function(f) { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); }); }
        this._dough = this._counter = this._readyGlow = this._flour = null;
    }
};
