export default {
    name: 'Dilly-Dallying',
    label: 'dilly-dallying',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Goal dot on right
        var goalGeo = new THREE.SphereGeometry(0.03, 8, 8);
        var goalMat = new THREE.MeshBasicMaterial({
            color: 0x44ff88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._goal = new THREE.Mesh(goalGeo, goalMat);
        this._goal.position.set(ox + 0.8, oy, 0);
        this._goal.visible = false;
        scene.add(this._goal);

        // Goal glow
        var goalGlGeo = new THREE.SphereGeometry(0.06, 8, 8);
        var goalGlMat = new THREE.MeshBasicMaterial({
            color: 0x44ff88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._goalGlow = new THREE.Mesh(goalGlGeo, goalGlMat);
        this._goalGlow.position.set(ox + 0.8, oy, 0);
        scene.add(this._goalGlow);

        // Random distraction particle (shiny thing)
        var distGeo = new THREE.OctahedronGeometry(0.025, 0);
        var distMat = new THREE.MeshBasicMaterial({
            color: 0xffdd44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._distraction1 = new THREE.Mesh(distGeo, distMat);
        this._distraction1.position.set(ox + 0.2, oy + 0.25, 0);
        this._distraction1.visible = false;
        scene.add(this._distraction1);

        // Butterfly particle (two small planes as wings)
        this._butterfly = new THREE.Group();
        var wingGeo = new THREE.PlaneGeometry(0.03, 0.02);
        var wingMat1 = new THREE.MeshBasicMaterial({
            color: 0xff88dd, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        var wingMat2 = new THREE.MeshBasicMaterial({
            color: 0xdd88ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._wing1 = new THREE.Mesh(wingGeo, wingMat1);
        this._wing1.position.x = -0.015;
        this._wing2 = new THREE.Mesh(wingGeo, wingMat2);
        this._wing2.position.x = 0.015;
        this._butterfly.add(this._wing1);
        this._butterfly.add(this._wing2);
        this._butterfly.position.set(ox + 0.5, oy + 0.3, 0);
        this._butterfly.visible = false;
        scene.add(this._butterfly);

        // Daisy trail particles
        this._daisies = [];
        var daisyGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var d = 0; d < 15; d++) {
            var dColors = [0xffff88, 0xffffff, 0xffddaa, 0xffee66];
            var dMat = new THREE.MeshBasicMaterial({
                color: dColors[d % dColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var dMesh = new THREE.Mesh(daisyGeo, dMat);
            dMesh.visible = false;
            scene.add(dMesh);
            this._daisies.push({
                mesh: dMesh, life: 0, maxLife: 0, placed: false,
                px: 0, py: 0
            });
        }
        this._daisyIdx = 0;
        this._lastDaisy = 0;

        // Time wasted clock
        var clockGeo = new THREE.TorusGeometry(0.05, 0.005, 6, 16);
        var clockMat = new THREE.MeshBasicMaterial({
            color: 0xaabb99, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._clock = new THREE.Mesh(clockGeo, clockMat);
        this._clock.position.set(ox - 0.35, oy + 0.2, 0);
        this._clock.visible = false;
        scene.add(this._clock);

        var handGeo = new THREE.BoxGeometry(0.003, 0.04, 0.002);
        var handMat = new THREE.MeshBasicMaterial({
            color: 0x889977, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._clockHand = new THREE.Mesh(handGeo, handMat);
        this._clockHand.visible = false;
        scene.add(this._clockHand);

        // Leisurely pastel glow
        var pastelGeo = new THREE.SphereGeometry(0.35, 10, 10);
        var pastelMat = new THREE.MeshBasicMaterial({
            color: 0xccddff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._pastelGlow = new THREE.Mesh(pastelGeo, pastelMat);
        this._pastelGlow.position.set(ox, oy, 0);
        scene.add(this._pastelGlow);

        // Cloud spheres (lazy)
        this._clouds = [];
        var cloudGeo = new THREE.SphereGeometry(0.04, 6, 6);
        for (var c = 0; c < 3; c++) {
            var cMat = new THREE.MeshBasicMaterial({
                color: 0xeeeeff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var cMesh = new THREE.Mesh(cloudGeo, cMat);
            cMesh.visible = false;
            cMesh.position.set(ox - 0.3 + c * 0.3, oy + 0.35, 0);
            cMesh.scale.set(1 + c * 0.3, 0.6, 1);
            scene.add(cMesh);
            this._clouds.push({ mesh: cMesh, baseX: ox - 0.3 + c * 0.3 });
        }

        this._modelX = ox;
        this._modelY = oy;
    },
    _placeDaisy(x, y) {
        var d = this._daisies[this._daisyIdx % this._daisies.length];
        this._daisyIdx++;
        d.mesh.visible = true;
        d.mesh.position.set(x, y - 0.05, 0);
        d.placed = true;
        d.px = x;
        d.py = y - 0.05;
        d.mesh.material.opacity = 0.6;
        d.life = 4.0;
        d.maxLife = 4.0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.06) {
            // Phase 1: Goal appears, model starts walking toward it
            var t = progress / 0.06;
            this._goal.visible = true;
            this._goal.material.opacity = t * 0.7;
            this._goalGlow.material.opacity = t * 0.3;
            this._goalGlow.scale.setScalar(1 + Math.sin(time * 3) * 0.2);

            this._modelX = ox + t * 0.1;
            model.position.set(this._modelX, oy, oz);
            model.rotation.z = Math.sin(time * 6) * 0.02;
            this._pastelGlow.material.opacity = t * 0.05;
        } else if (progress < 0.22) {
            // Phase 2: Walking, then first distraction - shiny thing
            var t2 = (progress - 0.06) / 0.16;

            if (t2 < 0.3) {
                // Walking toward goal
                this._modelX = ox + 0.1 + t2 * 0.15;
                model.position.set(this._modelX, oy + Math.sin(time * 6) * 0.005, oz);
                model.rotation.z = Math.sin(time * 6) * 0.02;
            } else if (t2 < 0.5) {
                // Notices distraction - stops
                var noticeT = (t2 - 0.3) / 0.2;
                this._distraction1.visible = true;
                this._distraction1.material.opacity = noticeT * 0.7;
                this._distraction1.rotation.z = time * 3;
                model.rotation.z = noticeT * 0.1;
                model.position.set(this._modelX, oy, oz);
            } else {
                // Wanders toward distraction
                var wanderT = (t2 - 0.5) / 0.5;
                var targetX = ox + 0.2;
                var targetY = oy + 0.2;
                this._modelX = this._modelX + (targetX - this._modelX) * delta * 2;
                this._modelY = oy + wanderT * 0.15;
                model.position.set(this._modelX, this._modelY, oz);
                model.rotation.z = 0.1 - wanderT * 0.05;

                this._distraction1.material.opacity = 0.7;
                this._distraction1.rotation.z = time * 3;
                this._distraction1.scale.setScalar(1 + Math.sin(time * 4) * 0.2);
            }

            // Daisy trail
            if (time - this._lastDaisy > 0.3) {
                this._placeDaisy(this._modelX, model.position.y);
                this._lastDaisy = time;
            }

            this._goal.material.opacity = 0.7;
            this._goalGlow.material.opacity = 0.3;
            this._goalGlow.scale.setScalar(1 + Math.sin(time * 3) * 0.2);
            this._pastelGlow.material.opacity = 0.05;
        } else if (progress < 0.40) {
            // Phase 3: Examining distraction, then resumes
            var t3 = (progress - 0.22) / 0.18;

            if (t3 < 0.4) {
                // Examining (pause)
                model.position.set(this._modelX, oy + 0.15, oz);
                model.rotation.z = Math.sin(time * 2) * 0.05;
                this._distraction1.material.opacity = 0.7 - t3 * 0.5;
            } else {
                // Resumes toward goal
                var resumeT = (t3 - 0.4) / 0.6;
                this._modelX = this._modelX + (ox + 0.4 - this._modelX) * delta * 3;
                this._modelY = oy + 0.15 * (1 - resumeT);
                model.position.set(this._modelX, this._modelY, oz);
                model.rotation.z = Math.sin(time * 6) * 0.02 * resumeT;

                this._distraction1.material.opacity = Math.max(0, 0.3 - resumeT * 0.3);

                // Clock appears
                this._clock.visible = true;
                this._clock.material.opacity = resumeT * 0.4;
                this._clockHand.visible = true;
                this._clockHand.material.opacity = resumeT * 0.5;
            }

            // Daisies
            if (time - this._lastDaisy > 0.25) {
                this._placeDaisy(this._modelX, model.position.y);
                this._lastDaisy = time;
            }

            // Clock hand spins slowly
            var chx = ox - 0.35;
            var chy = oy + 0.2;
            this._clockHand.position.set(chx + Math.sin(time * 2) * 0.018, chy + Math.cos(time * 2) * 0.018, 0.01);
            this._clockHand.rotation.z = time * 2;
        } else if (progress < 0.62) {
            // Phase 4: Second distraction - butterfly!
            var t4 = (progress - 0.40) / 0.22;

            this._butterfly.visible = true;

            if (t4 < 0.2) {
                // Walking, butterfly appears
                this._modelX += delta * 0.15;
                model.position.set(this._modelX, oy + Math.sin(time * 6) * 0.005, oz);
                this._wing1.material.opacity = t4 * 3;
                this._wing2.material.opacity = t4 * 3;
            } else if (t4 < 0.5) {
                // Chases butterfly
                var chaseT = (t4 - 0.2) / 0.3;
                var bfX = ox + 0.5 + Math.sin(time * 2) * 0.15;
                var bfY = oy + 0.25 + Math.cos(time * 1.5) * 0.1;
                this._butterfly.position.set(bfX, bfY, 0);

                this._modelX += (bfX - this._modelX) * delta * 1.5;
                this._modelY = oy + (bfY - oy) * 0.4;
                model.position.set(this._modelX, this._modelY, oz);
                model.rotation.z = Math.sin(time * 3) * 0.06;

                this._wing1.material.opacity = 0.6;
                this._wing2.material.opacity = 0.6;
            } else {
                // Butterfly flies away, model watches
                var flyT = (t4 - 0.5) / 0.5;
                var bfX2 = ox + 0.5 + flyT * 0.5 + Math.sin(time * 3) * 0.1;
                var bfY2 = oy + 0.3 + flyT * 0.3;
                this._butterfly.position.set(bfX2, bfY2, 0);
                this._wing1.material.opacity = 0.6 * (1 - flyT);
                this._wing2.material.opacity = 0.6 * (1 - flyT);

                model.position.set(this._modelX, this._modelY * (1 - flyT * 0.5), oz);
                model.rotation.z = flyT * -0.05;
            }

            // Wing flap animation
            this._wing1.rotation.y = Math.sin(time * 12) * 0.5;
            this._wing2.rotation.y = -Math.sin(time * 12) * 0.5;

            // Clouds drift
            for (var c = 0; c < this._clouds.length; c++) {
                var cloud = this._clouds[c];
                cloud.mesh.visible = true;
                cloud.mesh.material.opacity = 0.2;
                cloud.mesh.position.x = cloud.baseX + Math.sin(time * 0.3 + c) * 0.1;
            }

            // Clock spins faster
            this._clock.material.opacity = 0.4;
            this._clockHand.material.opacity = 0.5;
            var chx2 = ox - 0.35;
            var chy2 = oy + 0.2;
            this._clockHand.position.set(chx2 + Math.sin(time * 3) * 0.018, chy2 + Math.cos(time * 3) * 0.018, 0.01);
            this._clockHand.rotation.z = time * 3;

            if (time - this._lastDaisy > 0.2) {
                this._placeDaisy(this._modelX, model.position.y);
                this._lastDaisy = time;
            }

            this._pastelGlow.material.opacity = 0.06;
        } else if (progress < 0.82) {
            // Phase 5: Returns to path, finally heads toward goal
            var t5 = (progress - 0.62) / 0.20;
            this._butterfly.visible = false;
            this._distraction1.visible = false;

            this._modelX += (ox + 0.8 - this._modelX) * delta * 1.5;
            this._modelY = this._modelY + (oy - this._modelY) * delta * 3;
            model.position.set(this._modelX, this._modelY, oz);
            model.rotation.z = Math.sin(time * 6) * 0.02;

            // Clouds drift away
            for (var c2 = 0; c2 < this._clouds.length; c2++) {
                this._clouds[c2].mesh.material.opacity = 0.2 * (1 - t5);
            }

            // Clock fades
            this._clock.material.opacity = 0.4 * (1 - t5);
            this._clockHand.material.opacity = 0.5 * (1 - t5);

            if (time - this._lastDaisy > 0.15) {
                this._placeDaisy(this._modelX, model.position.y);
                this._lastDaisy = time;
            }

            // Goal pulses as model approaches
            this._goal.material.opacity = 0.7 + Math.sin(time * 4) * 0.2;
            this._goalGlow.material.opacity = 0.3 + t5 * 0.2;
            this._goalGlow.scale.setScalar(1 + Math.sin(time * 3) * 0.3);
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.82) / 0.18;
            model.position.set(
                ox + (this._modelX - ox) * (1 - t6),
                oy,
                oz
            );
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            this._goal.material.opacity = 0.7 * (1 - t6);
            this._goalGlow.material.opacity = 0.5 * (1 - t6);
            this._pastelGlow.material.opacity = 0.06 * (1 - t6);

            for (var c3 = 0; c3 < this._clouds.length; c3++) {
                this._clouds[c3].mesh.visible = false;
            }
            this._clock.visible = false;
            this._clockHand.visible = false;
        }

        // Update daisies
        for (var di = 0; di < this._daisies.length; di++) {
            var daisy = this._daisies[di];
            if (daisy.life <= 0) continue;
            daisy.life -= delta;
            if (daisy.life <= 0) { daisy.mesh.visible = false; continue; }
            daisy.mesh.material.opacity = Math.min(0.6, (daisy.life / daisy.maxLife) * 0.6);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._goal) { scene.remove(this._goal); this._goal.geometry.dispose(); this._goal.material.dispose(); }
        if (this._goalGlow) { scene.remove(this._goalGlow); this._goalGlow.geometry.dispose(); this._goalGlow.material.dispose(); }
        if (this._distraction1) { scene.remove(this._distraction1); this._distraction1.geometry.dispose(); this._distraction1.material.dispose(); }
        if (this._butterfly) {
            scene.remove(this._butterfly);
            this._wing1.geometry.dispose(); this._wing1.material.dispose();
            this._wing2.geometry.dispose(); this._wing2.material.dispose();
        }
        if (this._daisies) { this._daisies.forEach(function(d) { scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); }); }
        if (this._clock) { scene.remove(this._clock); this._clock.geometry.dispose(); this._clock.material.dispose(); }
        if (this._clockHand) { scene.remove(this._clockHand); this._clockHand.geometry.dispose(); this._clockHand.material.dispose(); }
        if (this._pastelGlow) { scene.remove(this._pastelGlow); this._pastelGlow.geometry.dispose(); this._pastelGlow.material.dispose(); }
        if (this._clouds) { this._clouds.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); }); }
        this._goal = this._goalGlow = this._distraction1 = this._butterfly = this._wing1 = this._wing2 = null;
        this._daisies = this._clock = this._clockHand = this._pastelGlow = this._clouds = null;
    }
};
