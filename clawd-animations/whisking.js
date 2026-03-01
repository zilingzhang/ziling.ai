export default {
    name: 'Whisking',
    label: 'whisking',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Bowl (half-sphere)
        var bowlGeo = new THREE.SphereGeometry(0.22, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
        var bowlMat = new THREE.MeshBasicMaterial({
            color: 0x888888, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._bowl = new THREE.Mesh(bowlGeo, bowlMat);
        this._bowl.rotation.x = Math.PI;
        this._bowl.position.set(ox - 0.25, oy - 0.18, 0);
        scene.add(this._bowl);

        // Liquid surface in bowl (rises as volume increases)
        var liqGeo = new THREE.CircleGeometry(0.19, 18);
        var liqMat = new THREE.MeshBasicMaterial({
            color: 0xffffee, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._liquid = new THREE.Mesh(liqGeo, liqMat);
        this._liquid.position.set(ox - 0.25, oy - 0.18, 0);
        scene.add(this._liquid);

        // Vortex ring in center
        var vortexGeo = new THREE.TorusGeometry(0.06, 0.01, 8, 16);
        var vortexMat = new THREE.MeshBasicMaterial({
            color: 0xeeeedd, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._vortex = new THREE.Mesh(vortexGeo, vortexMat);
        this._vortex.position.set(ox - 0.25, oy - 0.18, 0.01);
        this._vortex.rotation.x = Math.PI * 0.5;
        scene.add(this._vortex);

        // Air incorporation particles (white bubbles)
        this._airBubbles = [];
        var airGeo = new THREE.SphereGeometry(0.012, 5, 5);
        for (var i = 0; i < 30; i++) {
            var aMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var aMesh = new THREE.Mesh(airGeo, aMat);
            aMesh.visible = false;
            scene.add(aMesh);
            this._airBubbles.push({
                mesh: aMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._airIdx = 0;

        // Peak shapes (stiff peaks that form)
        this._peaks = [];
        var peakGeo = new THREE.ConeGeometry(0.025, 0.06, 6);
        for (var j = 0; j < 5; j++) {
            var pMat = new THREE.MeshBasicMaterial({
                color: 0xffffee, transparent: true, opacity: 0
            });
            var peak = new THREE.Mesh(peakGeo, pMat);
            peak.visible = false;
            var pAngle = (j / 5) * Math.PI * 2;
            peak.userData.baseX = ox - 0.25 + Math.cos(pAngle) * 0.1;
            peak.userData.baseY = oy - 0.14;
            scene.add(peak);
            this._peaks.push(peak);
        }

        // Whisk tool (thin lines in circular pattern)
        var whiskGroup = new THREE.Group();
        for (var w = 0; w < 6; w++) {
            var wAngle = (w / 6) * Math.PI * 2;
            var wGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.12, 4);
            var wMat = new THREE.MeshBasicMaterial({
                color: 0xcccccc, transparent: true, opacity: 0
            });
            var wire = new THREE.Mesh(wGeo, wMat);
            wire.position.set(Math.cos(wAngle) * 0.02, -0.06, Math.sin(wAngle) * 0.02);
            wire.rotation.x = wAngle * 0.1;
            whiskGroup.add(wire);
        }
        // Whisk handle
        var whHandleGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.1, 6);
        var whHandleMat = new THREE.MeshBasicMaterial({
            color: 0x999999, transparent: true, opacity: 0
        });
        var whHandle = new THREE.Mesh(whHandleGeo, whHandleMat);
        whHandle.position.set(0, 0.05, 0);
        whiskGroup.add(whHandle);

        this._whiskGroup = whiskGroup;
        this._whiskGroup.position.set(ox - 0.25, oy - 0.1, 0.05);
        scene.add(this._whiskGroup);

        // Achievement sparkle glow
        var sparkGeo = new THREE.SphereGeometry(0.3, 10, 10);
        var sparkMat = new THREE.MeshBasicMaterial({
            color: 0xffffaa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._achieveGlow = new THREE.Mesh(sparkGeo, sparkMat);
        this._achieveGlow.position.set(ox - 0.25, oy - 0.15, 0);
        scene.add(this._achieveGlow);

        // Achievement sparkle particles
        this._sparkles = [];
        var spkGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var s = 0; s < 15; s++) {
            var spMat = new THREE.MeshBasicMaterial({
                color: 0xffff88, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spMesh = new THREE.Mesh(spkGeo, spMat);
            spMesh.visible = false;
            scene.add(spMesh);
            this._sparkles.push({
                mesh: spMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._sparkIdx = 0;

        this._liquidLevel = 0;
    },
    _spawnAir(x, y) {
        var a = this._airBubbles[this._airIdx % this._airBubbles.length];
        this._airIdx++;
        a.mesh.visible = true;
        a.mesh.position.set(
            x + (Math.random() - 0.5) * 0.2,
            y + (Math.random() - 0.5) * 0.06,
            (Math.random() - 0.5) * 0.06
        );
        a.vx = (Math.random() - 0.5) * 0.15;
        a.vy = 0.05 + Math.random() * 0.1;
        a.life = 0.4 + Math.random() * 0.4;
        a.maxLife = a.life;
        a.mesh.material.opacity = 0.5;
    },
    _spawnSparkle(x, y) {
        var s = this._sparkles[this._sparkIdx % this._sparkles.length];
        this._sparkIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x + (Math.random() - 0.5) * 0.3, y + (Math.random() - 0.5) * 0.15, 0.05);
        s.vx = (Math.random() - 0.5) * 0.4;
        s.vy = (Math.random() - 0.5) * 0.4;
        s.life = 0.3 + Math.random() * 0.3;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.8;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var bowlX = ox - 0.25;
        var bowlY = oy - 0.18;

        // Set whisk wire opacity based on parent visibility
        var whiskOpacity = 0;

        if (progress < 0.08) {
            // Phase 1: Bowl with liquid appears
            var t = progress / 0.08;
            var ease = t * t;
            this._bowl.material.opacity = ease * 0.7;
            this._liquid.material.opacity = ease * 0.3;
            whiskOpacity = ease * 0.5;
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.40) {
            // Phase 2: Rapid whisking, vortex forms
            var t2 = (progress - 0.08) / 0.32;
            this._bowl.material.opacity = 0.7;
            this._liquid.material.opacity = 0.3 + t2 * 0.1;
            whiskOpacity = 0.5;

            // Whisk circular motion (fast)
            var whiskAngle = time * 8;
            var whiskRadius = 0.05;
            this._whiskGroup.position.set(
                bowlX + Math.cos(whiskAngle) * whiskRadius,
                bowlY + 0.08,
                0.05
            );
            this._whiskGroup.rotation.z = Math.sin(whiskAngle * 0.5) * 0.15;

            // Vortex appears
            this._vortex.material.opacity = t2 * 0.3;
            this._vortex.rotation.z = time * 5;
            this._vortex.scale.setScalar(0.5 + t2 * 0.5);

            // Air incorporation
            if (Math.random() < 0.08 + t2 * 0.1) {
                this._spawnAir(bowlX, bowlY);
            }

            // Model whisks rapidly
            model.position.set(
                ox + 0.15 + Math.cos(time * 6) * 0.02,
                oy + Math.sin(time * 6) * 0.01,
                oz
            );
            model.rotation.z = Math.sin(time * 6) * 0.04;
        } else if (progress < 0.65) {
            // Phase 3: Volume increases, peaks start forming
            var t3 = (progress - 0.40) / 0.25;
            whiskOpacity = 0.5;

            // Liquid rises in bowl
            this._liquidLevel = t3 * 0.04;
            this._liquid.position.y = bowlY + this._liquidLevel;
            this._liquid.material.opacity = 0.4 + t3 * 0.15;
            this._liquid.scale.setScalar(1 + t3 * 0.08);

            // Whisk still going
            var wa2 = time * 7;
            this._whiskGroup.position.set(
                bowlX + Math.cos(wa2) * 0.04,
                bowlY + 0.08 + this._liquidLevel,
                0.05
            );
            this._whiskGroup.rotation.z = Math.sin(wa2 * 0.5) * 0.12;

            // Vortex deepens
            this._vortex.material.opacity = 0.3 + t3 * 0.1;
            this._vortex.rotation.z = time * 5;
            this._vortex.position.y = bowlY + this._liquidLevel;

            // Air bubbles
            if (Math.random() < 0.1) {
                this._spawnAir(bowlX, bowlY + this._liquidLevel);
            }

            // Peaks start forming
            var numPeaks = Math.floor(t3 * this._peaks.length);
            for (var pi = 0; pi < this._peaks.length; pi++) {
                if (pi < numPeaks) {
                    var peak = this._peaks[pi];
                    peak.visible = true;
                    var peakGrow = Math.min(1, (t3 * this._peaks.length - pi) / 1);
                    peak.position.set(
                        peak.userData.baseX,
                        peak.userData.baseY + this._liquidLevel,
                        0
                    );
                    peak.scale.set(peakGrow, peakGrow, peakGrow);
                    peak.material.opacity = peakGrow * 0.7;
                }
            }

            model.position.set(
                ox + 0.15 + Math.cos(time * 5) * 0.015,
                oy + Math.sin(time * 5) * 0.01,
                oz
            );
            model.rotation.z = Math.sin(time * 5) * 0.03;
        } else if (progress < 0.78) {
            // Phase 4: Stiff peak test - model lifts whisk, peak holds
            var t4 = (progress - 0.65) / 0.13;
            this._liquid.position.y = bowlY + 0.04;
            this._liquid.material.opacity = 0.55;

            // All peaks visible
            for (var pk = 0; pk < this._peaks.length; pk++) {
                this._peaks[pk].visible = true;
                this._peaks[pk].material.opacity = 0.7;
                this._peaks[pk].scale.setScalar(1);
                this._peaks[pk].position.y = oy - 0.14 + 0.04;
            }

            // Whisk lifts up
            var liftY = t4 * 0.12;
            this._whiskGroup.position.set(bowlX, bowlY + 0.08 + 0.04 + liftY, 0.05);
            this._whiskGroup.rotation.z = 0;
            whiskOpacity = 0.5;

            // Vortex fades
            this._vortex.material.opacity = 0.4 * (1 - t4);

            // Peak on whisk tip holds shape (one peak follows whisk)
            if (this._peaks.length > 0) {
                var tipPeak = this._peaks[0];
                tipPeak.position.set(bowlX, bowlY + 0.14 + liftY, 0.05);
                // Peak droops slightly then holds
                var droop = Math.sin(t4 * Math.PI) * 0.01;
                tipPeak.rotation.z = droop;
            }

            model.position.set(ox + 0.15, oy + liftY * 0.3, oz);
            model.rotation.z = 0;
        } else if (progress < 0.90) {
            // Phase 5: Achievement sparkle!
            var t5 = (progress - 0.78) / 0.12;
            whiskOpacity = 0.5 * (1 - t5 * 0.5);

            // Achievement glow
            this._achieveGlow.material.opacity = t5 * 0.3;
            this._achieveGlow.scale.setScalar(1 + Math.sin(time * 4) * 0.15);

            // Sparkle particles
            if (Math.random() < 0.12) {
                this._spawnSparkle(bowlX, bowlY + 0.05);
            }

            // All peaks proud
            for (var ap = 0; ap < this._peaks.length; ap++) {
                this._peaks[ap].material.opacity = 0.7;
            }

            model.position.set(ox + 0.15, oy + 0.02, oz);
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.90) / 0.10;
            this._bowl.material.opacity = 0.7 * (1 - t6);
            this._liquid.material.opacity = 0.55 * (1 - t6);
            this._vortex.material.opacity = 0;
            this._achieveGlow.material.opacity = 0.3 * (1 - t6);
            whiskOpacity = 0.5 * (1 - t6);
            for (var fp = 0; fp < this._peaks.length; fp++) {
                this._peaks[fp].material.opacity = 0.7 * (1 - t6);
            }

            model.position.set(ox + 0.15 * (1 - t6), oy + 0.02 * (1 - t6), oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Set whisk opacity on all children
        this._whiskGroup.traverse(function(child) {
            if (child.material) {
                child.material.opacity = whiskOpacity;
                child.material.transparent = true;
            }
        });

        // Update air bubbles
        for (var ai = 0; ai < this._airBubbles.length; ai++) {
            var ab = this._airBubbles[ai];
            if (ab.life <= 0) continue;
            ab.life -= delta;
            if (ab.life <= 0) { ab.mesh.visible = false; continue; }
            ab.mesh.position.x += ab.vx * delta;
            ab.mesh.position.y += ab.vy * delta;
            ab.mesh.position.x += Math.sin(time * 6 + ai * 2) * 0.002;
            var alr = ab.life / ab.maxLife;
            ab.mesh.material.opacity = alr * 0.4;
            ab.mesh.scale.setScalar(0.5 + (1 - alr) * 0.5);
        }

        // Update sparkles
        for (var si = 0; si < this._sparkles.length; si++) {
            var sp = this._sparkles[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
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
        if (this._bowl) { scene.remove(this._bowl); this._bowl.geometry.dispose(); this._bowl.material.dispose(); }
        if (this._liquid) { scene.remove(this._liquid); this._liquid.geometry.dispose(); this._liquid.material.dispose(); }
        if (this._vortex) { scene.remove(this._vortex); this._vortex.geometry.dispose(); this._vortex.material.dispose(); }
        if (this._achieveGlow) { scene.remove(this._achieveGlow); this._achieveGlow.geometry.dispose(); this._achieveGlow.material.dispose(); }
        if (this._whiskGroup) {
            this._whiskGroup.traverse(function(child) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            scene.remove(this._whiskGroup);
        }
        if (this._peaks) { this._peaks.forEach(function(p) { scene.remove(p); p.geometry.dispose(); p.material.dispose(); }); }
        if (this._airBubbles) { this._airBubbles.forEach(function(a) { scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose(); }); }
        if (this._sparkles) { this._sparkles.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._bowl = this._liquid = this._vortex = this._achieveGlow = this._whiskGroup = this._peaks = this._airBubbles = this._sparkles = null;
    }
};
