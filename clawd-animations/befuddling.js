export default {
    name: 'Befuddling',
    label: 'befuddling',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var gs = this._origScale.x;

        // Confusion spiral torus rings orbiting model's head
        this._spirals = [];
        var spiralColors = [0x9966ff, 0xff66aa, 0x66aaff, 0xffaa66];
        for (var i = 0; i < 4; i++) {
            var tGeo = new THREE.TorusGeometry(0.08, 0.012, 6, 16);
            var tMat = new THREE.MeshBasicMaterial({
                color: spiralColors[i], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var tMesh = new THREE.Mesh(tGeo, tMat);
            tMesh.visible = false;
            scene.add(tMesh);
            this._spirals.push({ mesh: tMesh, angle: (i / 4) * Math.PI * 2, radius: 0.2 + i * 0.04 });
        }

        // Question mark cubes (small cube arrangements)
        this._questions = [];
        var qGeo = new THREE.BoxGeometry(0.025, 0.025, 0.025);
        for (var q = 0; q < 8; q++) {
            var qMat = new THREE.MeshBasicMaterial({
                color: 0xffdd44, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var qMesh = new THREE.Mesh(qGeo, qMat);
            qMesh.visible = false;
            scene.add(qMesh);
            this._questions.push({
                mesh: qMesh, baseAngle: (q / 8) * Math.PI * 2,
                dist: 0.35 + Math.random() * 0.15,
                spawnTime: 0.1 + q * 0.08,
                yOff: (Math.random() - 0.5) * 0.2
            });
        }

        // Dizzy star particles circling
        this._stars = [];
        var starGeo = new THREE.OctahedronGeometry(0.018, 0);
        for (var s = 0; s < 12; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0xffffaa, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sMesh = new THREE.Mesh(starGeo, sMat);
            sMesh.visible = false;
            scene.add(sMesh);
            this._stars.push({
                mesh: sMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, angle: 0, orbitR: 0, orbitSpeed: 0
            });
        }
        this._starIdx = 0;
        this._lastStar = 0;

        // Spiral eye particles (two small spiral-shaped indicators)
        this._eyes = [];
        for (var e = 0; e < 2; e++) {
            var eGeo = new THREE.TorusGeometry(0.02, 0.005, 4, 12);
            var eMat = new THREE.MeshBasicMaterial({
                color: 0xff44ff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var eMesh = new THREE.Mesh(eGeo, eMat);
            eMesh.visible = false;
            scene.add(eMesh);
            this._eyes.push({ mesh: eMesh, side: e === 0 ? -1 : 1 });
        }

        // Flipping map (flat box)
        var mapGeo = new THREE.BoxGeometry(0.12, 0.09, 0.005);
        var mapMat = new THREE.MeshBasicMaterial({
            color: 0x88cc88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._map = new THREE.Mesh(mapGeo, mapMat);
        this._map.visible = false;
        scene.add(this._map);

        // Foggy confusion cloud
        this._fogParticles = [];
        var fogGeo = new THREE.SphereGeometry(0.06, 6, 6);
        for (var f = 0; f < 10; f++) {
            var fMat = new THREE.MeshBasicMaterial({
                color: 0x8888bb, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
                side: THREE.DoubleSide
            });
            var fMesh = new THREE.Mesh(fogGeo, fMat);
            fMesh.visible = false;
            fMesh.scale.setScalar(0.5 + Math.random() * 1.0);
            scene.add(fMesh);
            this._fogParticles.push({
                mesh: fMesh,
                offX: (Math.random() - 0.5) * 0.6,
                offY: (Math.random() - 0.5) * 0.3 + 0.1,
                phase: Math.random() * Math.PI * 2
            });
        }

        // Clarity flash
        var clGeo = new THREE.SphereGeometry(0.5, 12, 12);
        var clMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._clarityFlash = new THREE.Mesh(clGeo, clMat);
        this._clarityFlash.position.set(ox, oy, 0);
        scene.add(this._clarityFlash);
    },
    _emitStar(x, y) {
        var s = this._stars[this._starIdx % this._stars.length];
        this._starIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x, y, 0);
        s.orbitR = 0.12 + Math.random() * 0.1;
        s.orbitSpeed = 3 + Math.random() * 4;
        s.angle = Math.random() * Math.PI * 2;
        s.life = 0.8 + Math.random() * 0.5;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.9;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.08) {
            // Phase 1: Onset - model starts to look confused
            var t = progress / 0.08;
            model.rotation.z = Math.sin(time * 2) * t * 0.05;
            // Spirals begin appearing
            for (var i = 0; i < this._spirals.length; i++) {
                var sp = this._spirals[i];
                sp.mesh.visible = true;
                sp.mesh.material.opacity = t * 0.4;
                sp.angle += delta * 2;
                sp.mesh.position.set(
                    ox + Math.cos(sp.angle) * sp.radius * t,
                    oy + 0.2 + Math.sin(sp.angle) * sp.radius * 0.4 * t,
                    Math.sin(sp.angle) * 0.05
                );
                sp.mesh.rotation.x = sp.angle;
                sp.mesh.rotation.z = time * 2;
            }
        } else if (progress < 0.25) {
            // Phase 2: Confusion builds - stumbling, question marks appear
            var t2 = (progress - 0.08) / 0.17;
            var stumble = Math.sin(time * 3) * 0.08 * t2;
            model.position.set(ox + stumble, oy + Math.sin(time * 2.5) * 0.02 * t2, oz);
            model.rotation.z = Math.sin(time * 2.5) * 0.08 * t2;

            // Spirals orbit faster
            for (var i2 = 0; i2 < this._spirals.length; i2++) {
                var sp2 = this._spirals[i2];
                sp2.mesh.visible = true;
                sp2.mesh.material.opacity = 0.4 + t2 * 0.3;
                sp2.angle += delta * (3 + t2 * 2);
                sp2.mesh.position.set(
                    model.position.x + Math.cos(sp2.angle) * sp2.radius,
                    model.position.y + 0.2 + Math.sin(sp2.angle) * sp2.radius * 0.4,
                    Math.sin(sp2.angle) * 0.05
                );
                sp2.mesh.rotation.x = sp2.angle * 1.5;
                sp2.mesh.rotation.z = time * 3;
            }

            // Question marks fade in
            for (var q = 0; q < this._questions.length; q++) {
                var qp = this._questions[q];
                if (t2 > qp.spawnTime) {
                    qp.mesh.visible = true;
                    var qLife = (t2 - qp.spawnTime) / (1 - qp.spawnTime);
                    qp.mesh.material.opacity = Math.min(qLife * 2, 0.7);
                    var qAngle = qp.baseAngle + time * 1.5;
                    qp.mesh.position.set(
                        model.position.x + Math.cos(qAngle) * qp.dist,
                        model.position.y + 0.1 + qp.yOff + Math.sin(time * 2 + q) * 0.02,
                        0
                    );
                    qp.mesh.rotation.z = time * 2 + q;
                }
            }
        } else if (progress < 0.50) {
            // Phase 3: Peak confusion - dizzy stars, spiral eyes, map flipping
            var t3 = (progress - 0.25) / 0.25;
            var drunkSway = Math.sin(time * 4) * 0.12 + Math.sin(time * 2.7) * 0.06;
            var drunkBob = Math.cos(time * 3.3) * 0.05;
            model.position.set(ox + drunkSway, oy + drunkBob, oz);
            model.rotation.z = Math.sin(time * 3) * 0.12;
            model.scale.set(gs * (1 + Math.sin(time * 5) * 0.02), gs * (1 - Math.sin(time * 5) * 0.02), gs);

            // Spiral eyes
            for (var e = 0; e < this._eyes.length; e++) {
                var eye = this._eyes[e];
                eye.mesh.visible = true;
                eye.mesh.material.opacity = 0.5 + t3 * 0.3;
                eye.mesh.position.set(
                    model.position.x + eye.side * 0.04,
                    model.position.y + 0.08,
                    0.05
                );
                eye.mesh.rotation.z = time * 8 * eye.side;
                eye.mesh.scale.setScalar(0.8 + Math.sin(time * 6) * 0.2);
            }

            // Spirals orbit fast
            for (var i3 = 0; i3 < this._spirals.length; i3++) {
                var sp3 = this._spirals[i3];
                sp3.angle += delta * 6;
                sp3.mesh.material.opacity = 0.6;
                sp3.mesh.position.set(
                    model.position.x + Math.cos(sp3.angle) * sp3.radius,
                    model.position.y + 0.2 + Math.sin(sp3.angle) * sp3.radius * 0.5,
                    Math.sin(sp3.angle) * 0.08
                );
                sp3.mesh.rotation.x = sp3.angle * 2;
            }

            // Questions multiply and swirl
            for (var q2 = 0; q2 < this._questions.length; q2++) {
                var qp2 = this._questions[q2];
                qp2.mesh.visible = true;
                qp2.mesh.material.opacity = 0.6 + Math.sin(time * 3 + q2) * 0.2;
                var qAngle2 = qp2.baseAngle + time * 2.5;
                qp2.mesh.position.set(
                    model.position.x + Math.cos(qAngle2) * (qp2.dist + Math.sin(time * 2) * 0.05),
                    model.position.y + 0.1 + qp2.yOff + Math.sin(time * 3 + q2) * 0.04,
                    0
                );
                qp2.mesh.rotation.set(time * 2 + q2, time * 1.5, time * 3);
                qp2.mesh.scale.setScalar(1 + t3 * 0.5);
            }

            // Map appears and flips
            this._map.visible = true;
            this._map.material.opacity = 0.5 + Math.sin(time * 2) * 0.2;
            this._map.position.set(
                model.position.x + 0.25,
                model.position.y - 0.05,
                0.02
            );
            this._map.rotation.y = time * 4;
            this._map.rotation.z = Math.sin(time * 3) * 0.3;

            // Emit dizzy stars
            if (time - this._lastStar > 0.12) {
                this._emitStar(model.position.x, model.position.y + 0.15);
                this._lastStar = time;
            }

            // Fog builds
            for (var f = 0; f < this._fogParticles.length; f++) {
                var fog = this._fogParticles[f];
                fog.mesh.visible = true;
                fog.mesh.material.opacity = t3 * 0.15;
                fog.mesh.position.set(
                    model.position.x + fog.offX + Math.sin(time * 0.8 + fog.phase) * 0.1,
                    model.position.y + fog.offY + Math.cos(time * 0.6 + fog.phase) * 0.05,
                    -0.05
                );
            }
        } else if (progress < 0.70) {
            // Phase 4: Maximum bewilderment - everything intensifies
            var t4 = (progress - 0.50) / 0.20;
            var crazySway = Math.sin(time * 5) * 0.15 + Math.cos(time * 3.7) * 0.1;
            model.position.set(ox + crazySway, oy + Math.sin(time * 4) * 0.06, oz);
            model.rotation.z = Math.sin(time * 4) * 0.15;

            // Eyes spin wildly
            for (var e2 = 0; e2 < this._eyes.length; e2++) {
                var eye2 = this._eyes[e2];
                eye2.mesh.material.opacity = 0.8;
                eye2.mesh.position.set(
                    model.position.x + eye2.side * 0.04,
                    model.position.y + 0.08,
                    0.05
                );
                eye2.mesh.rotation.z = time * 12 * eye2.side;
            }

            // Spirals go crazy
            for (var i4 = 0; i4 < this._spirals.length; i4++) {
                var sp4 = this._spirals[i4];
                sp4.angle += delta * 8;
                sp4.mesh.material.opacity = 0.7;
                sp4.mesh.position.set(
                    model.position.x + Math.cos(sp4.angle) * sp4.radius * (1 + t4 * 0.3),
                    model.position.y + 0.2 + Math.sin(sp4.angle) * sp4.radius * 0.6,
                    Math.sin(sp4.angle) * 0.1
                );
            }

            // Questions everywhere
            for (var q3 = 0; q3 < this._questions.length; q3++) {
                var qp3 = this._questions[q3];
                qp3.mesh.material.opacity = 0.8;
                var qAngle3 = qp3.baseAngle + time * 3;
                qp3.mesh.position.set(
                    model.position.x + Math.cos(qAngle3) * (qp3.dist * 1.3),
                    model.position.y + qp3.yOff + Math.sin(time * 4 + q3) * 0.06,
                    0
                );
                qp3.mesh.scale.setScalar(1.5 + Math.sin(time * 4 + q3) * 0.3);
            }

            // Map spins out of control
            this._map.rotation.y = time * 8;
            this._map.rotation.x = time * 3;
            this._map.material.opacity = 0.6;

            // Dense fog
            for (var f2 = 0; f2 < this._fogParticles.length; f2++) {
                var fog2 = this._fogParticles[f2];
                fog2.mesh.material.opacity = 0.2 + t4 * 0.1;
                fog2.mesh.position.set(
                    model.position.x + fog2.offX + Math.sin(time + fog2.phase) * 0.15,
                    model.position.y + fog2.offY + Math.cos(time * 0.8 + fog2.phase) * 0.08,
                    -0.05
                );
            }

            // Stars
            if (time - this._lastStar > 0.08) {
                this._emitStar(model.position.x, model.position.y + 0.15);
                this._lastStar = time;
            }
        } else if (progress < 0.85) {
            // Phase 5: Sudden clarity flash!
            var t5 = (progress - 0.70) / 0.15;

            if (t5 < 0.15) {
                // Flash
                this._clarityFlash.material.opacity = (1 - t5 / 0.15) * 0.8;
                this._clarityFlash.scale.setScalar(1 + t5 * 5);
                this._clarityFlash.position.set(model.position.x, model.position.y, 0);
            } else {
                this._clarityFlash.material.opacity = 0;
            }

            // Everything starts dispersing
            var disperse = t5 * t5;
            for (var i5 = 0; i5 < this._spirals.length; i5++) {
                var sp5 = this._spirals[i5];
                sp5.mesh.material.opacity = 0.7 * (1 - disperse);
                sp5.angle += delta * (8 - t5 * 6);
                sp5.mesh.position.set(
                    ox + Math.cos(sp5.angle) * sp5.radius * (1 + disperse * 2),
                    oy + 0.2 + Math.sin(sp5.angle) * sp5.radius * (1 + disperse),
                    0
                );
            }

            for (var q4 = 0; q4 < this._questions.length; q4++) {
                this._questions[q4].mesh.material.opacity = 0.8 * (1 - disperse);
            }

            for (var e3 = 0; e3 < this._eyes.length; e3++) {
                this._eyes[e3].mesh.material.opacity = 0.8 * (1 - disperse);
            }

            this._map.material.opacity = 0.6 * (1 - disperse);

            for (var f3 = 0; f3 < this._fogParticles.length; f3++) {
                this._fogParticles[f3].mesh.material.opacity = 0.3 * (1 - disperse);
            }

            // Model straightens up
            model.position.set(
                ox + (model.position.x - ox) * (1 - disperse),
                oy + (model.position.y - oy) * (1 - disperse),
                oz
            );
            model.rotation.z = model.rotation.z * (1 - disperse);
            model.scale.setScalar(gs);
        } else {
            // Phase 6: Clarity - everything fades, model is still
            var t6 = (progress - 0.85) / 0.15;
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            for (var i6 = 0; i6 < this._spirals.length; i6++) {
                this._spirals[i6].mesh.material.opacity = Math.max(0, 0.1 * (1 - t6));
            }
            for (var q5 = 0; q5 < this._questions.length; q5++) {
                this._questions[q5].mesh.material.opacity = Math.max(0, 0.1 * (1 - t6));
            }
            for (var e4 = 0; e4 < this._eyes.length; e4++) {
                this._eyes[e4].mesh.material.opacity = 0;
                this._eyes[e4].mesh.visible = false;
            }
            this._map.material.opacity = 0;
            this._map.visible = false;
            for (var f4 = 0; f4 < this._fogParticles.length; f4++) {
                this._fogParticles[f4].mesh.material.opacity = 0;
            }
            this._clarityFlash.material.opacity = 0;
        }

        // Update dizzy star particles
        for (var si = 0; si < this._stars.length; si++) {
            var star = this._stars[si];
            if (star.life <= 0) continue;
            star.life -= delta;
            if (star.life <= 0) { star.mesh.visible = false; continue; }
            star.angle += star.orbitSpeed * delta;
            star.mesh.position.x = model.position.x + Math.cos(star.angle) * star.orbitR;
            star.mesh.position.y = model.position.y + 0.15 + Math.sin(star.angle) * star.orbitR * 0.4;
            star.mesh.rotation.z = time * 5;
            star.mesh.material.opacity = (star.life / star.maxLife) * 0.8;
            star.mesh.scale.setScalar(0.5 + (star.life / star.maxLife) * 0.7);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._spirals) { this._spirals.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._questions) { this._questions.forEach(function(q) { scene.remove(q.mesh); q.mesh.geometry.dispose(); q.mesh.material.dispose(); }); }
        if (this._stars) { this._stars.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._eyes) { this._eyes.forEach(function(e) { scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); }); }
        if (this._map) { scene.remove(this._map); this._map.geometry.dispose(); this._map.material.dispose(); }
        if (this._fogParticles) { this._fogParticles.forEach(function(f) { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); }); }
        if (this._clarityFlash) { scene.remove(this._clarityFlash); this._clarityFlash.geometry.dispose(); this._clarityFlash.material.dispose(); }
        this._spirals = this._questions = this._stars = this._eyes = this._map = this._fogParticles = this._clarityFlash = null;
    }
};
