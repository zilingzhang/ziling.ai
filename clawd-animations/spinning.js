export default {
    name: 'Spinning',
    label: 'spinning',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Centrifugal particles (fly outward)
        this._centrifugal = [];
        var cfGeo = new THREE.SphereGeometry(0.015, 4, 4);
        for (var i = 0; i < 30; i++) {
            var cMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0x6644ff : (i % 3 === 1 ? 0x8866ff : 0xaa88ff),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var cf = new THREE.Mesh(cfGeo, cMat);
            cf.visible = false;
            scene.add(cf);
            this._centrifugal.push({
                mesh: cf, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._cfIdx = 0;

        // Gyroscopic stabilization rings
        this._gyroRings = [];
        var ringGeo = new THREE.TorusGeometry(0.2, 0.008, 6, 24);
        for (var j = 0; j < 3; j++) {
            var rMat = new THREE.MeshBasicMaterial({
                color: j === 0 ? 0x6644ff : (j === 1 ? 0x4466ff : 0x8844ff),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ring = new THREE.Mesh(ringGeo, rMat);
            ring.position.set(ox, oy, 0);
            scene.add(ring);
            this._gyroRings.push(ring);
        }

        // Spin blur trail (ring of after-images)
        this._afterImages = [];
        var imgGeo = new THREE.SphereGeometry(0.06, 6, 6);
        for (var k = 0; k < 8; k++) {
            var iMat = new THREE.MeshBasicMaterial({
                color: 0x8866ff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var img = new THREE.Mesh(imgGeo, iMat);
            img.position.set(ox, oy, -0.01);
            scene.add(img);
            this._afterImages.push({
                mesh: img,
                angle: (k / 8) * Math.PI * 2
            });
        }

        // RPM glow
        var rpmGeo = new THREE.SphereGeometry(0.3, 16, 16);
        var rpmMat = new THREE.MeshBasicMaterial({
            color: 0x8844ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._rpmGlow = new THREE.Mesh(rpmGeo, rpmMat);
        this._rpmGlow.position.set(ox, oy, 0);
        scene.add(this._rpmGlow);

        // Dizzy star particles (end)
        this._stars = [];
        var starGeo = new THREE.OctahedronGeometry(0.02, 0);
        for (var s = 0; s < 6; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: s % 2 === 0 ? 0xffff44 : 0xffaa44,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var star = new THREE.Mesh(starGeo, sMat);
            star.visible = false;
            scene.add(star);
            this._stars.push({
                mesh: star,
                angle: (s / 6) * Math.PI * 2,
                radius: 0.15
            });
        }

        this._spinSpeed = 0;
        this._totalSpin = 0;
    },
    _spawnCentrifugal(ox, oy, speed) {
        var c = this._centrifugal[this._cfIdx % this._centrifugal.length];
        this._cfIdx++;
        c.mesh.visible = true;
        var angle = Math.random() * Math.PI * 2;
        c.mesh.position.set(ox, oy, 0);
        c.vx = Math.cos(angle) * speed;
        c.vy = Math.sin(angle) * speed;
        c.life = 0.3 + Math.random() * 0.3;
        c.maxLife = c.life;
        c.mesh.material.opacity = 0.8;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.10) {
            // Phase 1: Start slow spin
            var t = progress / 0.10;
            this._spinSpeed = t * 3;
            this._totalSpin += this._spinSpeed * delta;
            model.rotation.z = this._totalSpin;
            model.position.set(ox, oy, oz);

            // Gyro rings appear
            for (var i = 0; i < this._gyroRings.length; i++) {
                this._gyroRings[i].material.opacity = t * 0.3;
            }
        } else if (progress < 0.50) {
            // Phase 2: Accelerate, centrifugal particles
            var t2 = (progress - 0.10) / 0.40;
            this._spinSpeed = 3 + t2 * 15;
            this._totalSpin += this._spinSpeed * delta;
            model.rotation.z = this._totalSpin;
            model.position.set(ox, oy, oz);

            // Gyro rings spin at different rates
            for (var j = 0; j < this._gyroRings.length; j++) {
                this._gyroRings[j].material.opacity = 0.3 + t2 * 0.3;
                this._gyroRings[j].rotation.x = time * (2 + j * 1.5);
                this._gyroRings[j].rotation.y = time * (1 + j * 0.8);
                this._gyroRings[j].scale.setScalar(1 + Math.sin(time * 3 + j) * 0.1);
            }

            // Centrifugal particles
            if (Math.random() < 0.1 + t2 * 0.3) {
                this._spawnCentrifugal(ox, oy, 0.5 + t2 * 2.0);
            }

            // After-images appear
            for (var k = 0; k < this._afterImages.length; k++) {
                var ai = this._afterImages[k];
                var trailAngle = this._totalSpin + ai.angle;
                var trailRadius = 0.08 + t2 * 0.04;
                ai.mesh.position.set(
                    ox + Math.cos(trailAngle) * trailRadius,
                    oy + Math.sin(trailAngle) * trailRadius,
                    -0.01
                );
                ai.mesh.material.opacity = t2 * 0.2;
                ai.mesh.scale.setScalar(0.5 + t2 * 0.5);
            }
        } else if (progress < 0.70) {
            // Phase 3: Peak RPM, maximum glow
            var t3 = (progress - 0.50) / 0.20;
            this._spinSpeed = 18 + Math.sin(time * 2) * 2;
            this._totalSpin += this._spinSpeed * delta;
            model.rotation.z = this._totalSpin;
            model.position.set(ox, oy, oz);

            // RPM glow peaks
            this._rpmGlow.material.opacity = 0.2 + t3 * 0.15 + Math.sin(time * 6) * 0.05;
            this._rpmGlow.scale.setScalar(1 + Math.sin(time * 4) * 0.15);

            // Gyro rings intense
            for (var g = 0; g < this._gyroRings.length; g++) {
                this._gyroRings[g].material.opacity = 0.6 + Math.sin(time * 5 + g) * 0.1;
                this._gyroRings[g].rotation.x = time * (4 + g * 2);
                this._gyroRings[g].rotation.y = time * (3 + g * 1.5);
            }

            // More centrifugal
            if (Math.random() < 0.4) {
                this._spawnCentrifugal(ox, oy, 1.5 + Math.random() * 1.5);
            }

            // Strong after-images
            for (var ki = 0; ki < this._afterImages.length; ki++) {
                var ai2 = this._afterImages[ki];
                var trailAngle2 = this._totalSpin + ai2.angle;
                ai2.mesh.position.set(
                    ox + Math.cos(trailAngle2) * 0.12,
                    oy + Math.sin(trailAngle2) * 0.12,
                    -0.01
                );
                ai2.mesh.material.opacity = 0.2 + Math.sin(time * 8 + ki) * 0.08;
            }
        } else if (progress < 0.88) {
            // Phase 4: Deceleration, wobble
            var t4 = (progress - 0.70) / 0.18;
            this._spinSpeed = 18 * (1 - t4 * 0.85);
            this._totalSpin += this._spinSpeed * delta;

            // Wobble
            var wobble = t4 * Math.sin(time * 8) * 0.08;
            model.rotation.z = this._totalSpin + wobble;
            model.position.set(
                ox + Math.sin(time * 5) * t4 * 0.03,
                oy + Math.cos(time * 4) * t4 * 0.02,
                oz
            );

            // Glow fades
            this._rpmGlow.material.opacity = 0.35 * (1 - t4);
            for (var h = 0; h < this._gyroRings.length; h++) {
                this._gyroRings[h].material.opacity = 0.6 * (1 - t4);
            }

            // After-images fade
            for (var ai3 = 0; ai3 < this._afterImages.length; ai3++) {
                this._afterImages[ai3].mesh.material.opacity *= 0.96;
            }

            // Dizzy stars appear at end
            if (t4 > 0.5) {
                var starT = (t4 - 0.5) / 0.5;
                for (var si = 0; si < this._stars.length; si++) {
                    this._stars[si].mesh.visible = true;
                    var sAngle = this._stars[si].angle + time * 3;
                    this._stars[si].mesh.position.set(
                        ox + Math.cos(sAngle) * this._stars[si].radius,
                        oy + 0.15 + Math.sin(sAngle) * 0.05,
                        0.05
                    );
                    this._stars[si].mesh.material.opacity = starT * 0.6;
                    this._stars[si].mesh.rotation.z = time * 5;
                }
            }

            // Fewer centrifugal
            if (Math.random() < 0.05 * (1 - t4)) {
                this._spawnCentrifugal(ox, oy, 0.5);
            }
        } else {
            // Phase 5: Settle
            var t5 = (progress - 0.88) / 0.12;
            this._spinSpeed *= 0.9;
            this._totalSpin += this._spinSpeed * delta;
            model.rotation.z = this._totalSpin * (1 - t5);
            model.position.set(ox, oy, oz);

            // Stars fade
            for (var st = 0; st < this._stars.length; st++) {
                this._stars[st].mesh.material.opacity *= 0.92;
            }
            this._rpmGlow.material.opacity = 0;
            for (var gi = 0; gi < this._gyroRings.length; gi++) {
                this._gyroRings[gi].material.opacity = 0;
            }
            for (var af = 0; af < this._afterImages.length; af++) {
                this._afterImages[af].mesh.material.opacity = 0;
            }

            model.scale.copy(this._origScale);
        }

        // Update centrifugal particles
        for (var ci = 0; ci < this._centrifugal.length; ci++) {
            var cp = this._centrifugal[ci];
            if (cp.life <= 0) continue;
            cp.life -= delta;
            if (cp.life <= 0) { cp.mesh.visible = false; continue; }
            cp.mesh.position.x += cp.vx * delta;
            cp.mesh.position.y += cp.vy * delta;
            var lr = cp.life / cp.maxLife;
            cp.mesh.material.opacity = lr * 0.7;
            cp.mesh.scale.setScalar(0.5 + (1 - lr) * 0.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._centrifugal) { this._centrifugal.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); }); }
        if (this._gyroRings) { this._gyroRings.forEach(function(r) { scene.remove(r); r.geometry.dispose(); r.material.dispose(); }); }
        if (this._afterImages) { this._afterImages.forEach(function(a) { scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose(); }); }
        if (this._rpmGlow) { scene.remove(this._rpmGlow); this._rpmGlow.geometry.dispose(); this._rpmGlow.material.dispose(); }
        if (this._stars) { this._stars.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._centrifugal = this._gyroRings = this._afterImages = this._rpmGlow = this._stars = null;
    }
};
