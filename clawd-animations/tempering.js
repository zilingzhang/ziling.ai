export default {
    name: 'Tempering',
    label: 'tempering',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Heat surface (flat box)
        var surfGeo = new THREE.BoxGeometry(0.4, 0.03, 0.25);
        var surfMat = new THREE.MeshBasicMaterial({
            color: 0x555555, transparent: true, opacity: 0
        });
        this._surface = new THREE.Mesh(surfGeo, surfMat);
        this._surface.position.set(ox - 0.2, oy - 0.28, 0);
        scene.add(this._surface);

        // Heat element glow
        var heatGeo = new THREE.CircleGeometry(0.15, 14);
        var heatMat = new THREE.MeshBasicMaterial({
            color: 0xff4400, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._heatGlow = new THREE.Mesh(heatGeo, heatMat);
        this._heatGlow.position.set(ox - 0.2, oy - 0.265, 0.01);
        scene.add(this._heatGlow);

        // Material blob (chocolate/metal)
        var blobGeo = new THREE.SphereGeometry(0.08, 10, 10);
        var blobMat = new THREE.MeshBasicMaterial({
            color: 0x553322, transparent: true, opacity: 0
        });
        this._blob = new THREE.Mesh(blobGeo, blobMat);
        this._blob.position.set(ox - 0.2, oy - 0.22, 0);
        scene.add(this._blob);

        // Thermometer body (thin cylinder)
        var thermGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8);
        var thermMat = new THREE.MeshBasicMaterial({
            color: 0xdddddd, transparent: true, opacity: 0
        });
        this._therm = new THREE.Mesh(thermGeo, thermMat);
        this._therm.position.set(ox + 0.1, oy - 0.14, 0);
        scene.add(this._therm);

        // Thermometer fill (red rising cylinder inside)
        var fillGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8);
        var fillMat = new THREE.MeshBasicMaterial({
            color: 0xff2222, transparent: true, opacity: 0
        });
        this._thermFill = new THREE.Mesh(fillGeo, fillMat);
        this._thermFill.position.set(ox + 0.1, oy - 0.24, 0.01);
        scene.add(this._thermFill);

        // Thermometer bulb
        var bulbGeo = new THREE.SphereGeometry(0.02, 8, 8);
        var bulbMat = new THREE.MeshBasicMaterial({
            color: 0xff2222, transparent: true, opacity: 0
        });
        this._bulb = new THREE.Mesh(bulbGeo, bulbMat);
        this._bulb.position.set(ox + 0.1, oy - 0.25, 0.01);
        scene.add(this._bulb);

        // Crystal structure shapes (tiny geometric shapes that form)
        this._crystals = [];
        var crystalShapes = [
            new THREE.TetrahedronGeometry(0.015),
            new THREE.OctahedronGeometry(0.012),
            new THREE.IcosahedronGeometry(0.01),
            new THREE.BoxGeometry(0.012, 0.012, 0.012)
        ];
        for (var i = 0; i < 16; i++) {
            var cGeo = crystalShapes[i % crystalShapes.length];
            var cMat = new THREE.MeshBasicMaterial({
                color: 0xaa8866, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var crystal = new THREE.Mesh(cGeo, cMat);
            crystal.visible = false;
            var cAngle = (i / 16) * Math.PI * 2;
            var cDist = 0.04 + Math.random() * 0.04;
            crystal.userData.offsetX = Math.cos(cAngle) * cDist;
            crystal.userData.offsetY = Math.sin(cAngle) * cDist * 0.5;
            scene.add(crystal);
            this._crystals.push(crystal);
        }

        // Glossy finish glow
        var glossGeo = new THREE.SphereGeometry(0.15, 10, 10);
        var glossMat = new THREE.MeshBasicMaterial({
            color: 0xddaa66, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glossGlow = new THREE.Mesh(glossGeo, glossMat);
        this._glossGlow.position.set(ox - 0.2, oy - 0.2, 0);
        scene.add(this._glossGlow);

        // Heat shimmer particles
        this._shimmer = [];
        var shimGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var j = 0; j < 12; j++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0xff6633, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sMesh = new THREE.Mesh(shimGeo, sMat);
            sMesh.visible = false;
            scene.add(sMesh);
            this._shimmer.push({
                mesh: sMesh, life: 0, maxLife: 0,
                vy: 0, baseX: 0
            });
        }
        this._shimIdx = 0;

        this._tempLevel = 0; // 0 to 1 for thermometer
        this._cyclePhase = 0; // heat/cool cycles
    },
    _spawnShimmer(x, y) {
        var s = this._shimmer[this._shimIdx % this._shimmer.length];
        this._shimIdx++;
        s.mesh.visible = true;
        s.baseX = x + (Math.random() - 0.5) * 0.2;
        s.mesh.position.set(s.baseX, y, 0);
        s.vy = 0.3 + Math.random() * 0.2;
        s.life = 0.3 + Math.random() * 0.25;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.4;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var blobX = ox - 0.2;
        var blobY = oy - 0.22;

        if (progress < 0.08) {
            // Phase 1: Surface, blob, thermometer appear
            var t = progress / 0.08;
            var ease = t * t;
            this._surface.material.opacity = ease * 0.6;
            this._blob.material.opacity = ease * 0.8;
            this._therm.material.opacity = ease * 0.5;
            this._thermFill.material.opacity = ease * 0.7;
            this._bulb.material.opacity = ease * 0.7;
            model.position.set(ox + 0.2, oy, oz);
        } else if (progress < 0.30) {
            // Phase 2: Heat up - temperature rises, material begins to melt
            var t2 = (progress - 0.08) / 0.22;
            this._surface.material.opacity = 0.6;
            this._blob.material.opacity = 0.8;

            // Temperature rises
            this._tempLevel = t2 * 0.8;

            // Thermometer fill rises
            var fillHeight = 0.01 + this._tempLevel * 0.18;
            this._thermFill.scale.set(1, fillHeight / 0.01, 1);
            this._thermFill.position.y = oy - 0.25 + fillHeight * 0.5;

            // Heat glow intensifies
            this._heatGlow.material.opacity = t2 * 0.3 + Math.sin(time * 5) * 0.05;

            // Material begins melting (flattens, color softens)
            var melt = t2;
            this._blob.scale.set(1 + melt * 0.3, 1 - melt * 0.3, 1 + melt * 0.3);
            this._blob.material.color.setRGB(
                0.33 + melt * 0.2,
                0.2 + melt * 0.1,
                0.13 + melt * 0.05
            );

            // Heat shimmer
            if (Math.random() < 0.06 + t2 * 0.05) {
                this._spawnShimmer(blobX, oy - 0.26);
            }

            model.position.set(ox + 0.2, oy + Math.sin(time * 1.5) * 0.01, oz);
        } else if (progress < 0.48) {
            // Phase 3: Cool down carefully - temperature drops
            var t3 = (progress - 0.30) / 0.18;

            // Temperature drops
            this._tempLevel = 0.8 - t3 * 0.4;
            var fillHeight2 = 0.01 + this._tempLevel * 0.18;
            this._thermFill.scale.set(1, fillHeight2 / 0.01, 1);
            this._thermFill.position.y = oy - 0.25 + fillHeight2 * 0.5;

            // Heat glow reduces
            this._heatGlow.material.opacity = (1 - t3 * 0.5) * 0.3;

            // Material solidifies slightly (scale returns)
            this._blob.scale.set(1 + 0.3 * (1 - t3 * 0.5), 1 - 0.3 * (1 - t3 * 0.5), 1 + 0.3 * (1 - t3 * 0.5));

            // Color shifts
            this._blob.material.color.setRGB(
                0.53 - t3 * 0.1,
                0.3 - t3 * 0.05,
                0.18
            );

            // Less shimmer
            if (Math.random() < 0.03) {
                this._spawnShimmer(blobX, oy - 0.26);
            }

            model.position.set(ox + 0.2, oy, oz);
        } else if (progress < 0.68) {
            // Phase 4: Reheat cycle - temperature rises again precisely
            var t4 = (progress - 0.48) / 0.20;

            // Temperature rises again
            this._tempLevel = 0.4 + t4 * 0.35;
            var fillHeight3 = 0.01 + this._tempLevel * 0.18;
            this._thermFill.scale.set(1, fillHeight3 / 0.01, 1);
            this._thermFill.position.y = oy - 0.25 + fillHeight3 * 0.5;

            // Heat glow returns
            this._heatGlow.material.opacity = t4 * 0.25 + Math.sin(time * 4) * 0.05;

            // Material at perfect temper
            this._blob.scale.set(1 + 0.15, 1 - 0.15, 1 + 0.15);
            this._blob.material.color.setRGB(
                0.43 + t4 * 0.1,
                0.25 + t4 * 0.05,
                0.18 + t4 * 0.02
            );

            // Shimmer from reheat
            if (Math.random() < 0.04 + t4 * 0.03) {
                this._spawnShimmer(blobX, oy - 0.26);
            }

            model.position.set(ox + 0.2, oy + Math.sin(time * 1) * 0.005, oz);
            model.rotation.z = Math.sin(time * 0.8) * 0.02;
        } else if (progress < 0.85) {
            // Phase 5: Crystal structure forms, glossy finish
            var t5 = (progress - 0.68) / 0.17;

            // Heat reduces
            this._heatGlow.material.opacity = 0.25 * (1 - t5 * 0.7);
            this._tempLevel = 0.75 - t5 * 0.3;
            var fillHeight4 = 0.01 + this._tempLevel * 0.18;
            this._thermFill.scale.set(1, fillHeight4 / 0.01, 1);
            this._thermFill.position.y = oy - 0.25 + fillHeight4 * 0.5;

            // Crystal structures appear
            var numCrystals = Math.floor(t5 * this._crystals.length);
            for (var ci = 0; ci < this._crystals.length; ci++) {
                var crystal = this._crystals[ci];
                if (ci < numCrystals) {
                    crystal.visible = true;
                    crystal.position.set(
                        blobX + crystal.userData.offsetX,
                        blobY + crystal.userData.offsetY,
                        0.02
                    );
                    crystal.material.opacity = 0.5 + Math.sin(time * 4 + ci) * 0.1;
                    crystal.rotation.y += delta * 2;
                    crystal.rotation.x += delta * 1.5;
                }
            }

            // Blob takes on glossy appearance
            this._blob.material.color.setRGB(0.5 + t5 * 0.15, 0.3 + t5 * 0.1, 0.2 + t5 * 0.08);
            this._blob.scale.set(1 + 0.1, 1 - 0.1, 1 + 0.1);

            // Glossy glow
            this._glossGlow.material.opacity = t5 * 0.25;
            this._glossGlow.scale.setScalar(1 + Math.sin(time * 3) * 0.1);

            model.position.set(ox + 0.2, oy, oz);
            model.rotation.z = 0;
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.85) / 0.15;
            this._surface.material.opacity = 0.6 * (1 - t6);
            this._blob.material.opacity = 0.8 * (1 - t6);
            this._therm.material.opacity = 0.5 * (1 - t6);
            this._thermFill.material.opacity = 0.7 * (1 - t6);
            this._bulb.material.opacity = 0.7 * (1 - t6);
            this._heatGlow.material.opacity = 0.1 * (1 - t6);
            this._glossGlow.material.opacity = 0.25 * (1 - t6);
            for (var fi = 0; fi < this._crystals.length; fi++) {
                if (this._crystals[fi].visible) {
                    this._crystals[fi].material.opacity = 0.5 * (1 - t6);
                }
            }

            model.position.set(ox + 0.2 * (1 - t6), oy, oz);
            model.scale.copy(this._origScale);
        }

        // Update shimmer
        for (var si = 0; si < this._shimmer.length; si++) {
            var sh = this._shimmer[si];
            if (sh.life <= 0) continue;
            sh.life -= delta;
            if (sh.life <= 0) { sh.mesh.visible = false; continue; }
            sh.mesh.position.y += sh.vy * delta;
            sh.mesh.position.x = sh.baseX + Math.sin(time * 10 + si * 3) * 0.015;
            var slr = sh.life / sh.maxLife;
            sh.mesh.material.opacity = slr * 0.35;
            sh.mesh.scale.setScalar(0.5 + (1 - slr) * 0.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._surface) { scene.remove(this._surface); this._surface.geometry.dispose(); this._surface.material.dispose(); }
        if (this._blob) { scene.remove(this._blob); this._blob.geometry.dispose(); this._blob.material.dispose(); }
        if (this._therm) { scene.remove(this._therm); this._therm.geometry.dispose(); this._therm.material.dispose(); }
        if (this._thermFill) { scene.remove(this._thermFill); this._thermFill.geometry.dispose(); this._thermFill.material.dispose(); }
        if (this._bulb) { scene.remove(this._bulb); this._bulb.geometry.dispose(); this._bulb.material.dispose(); }
        if (this._heatGlow) { scene.remove(this._heatGlow); this._heatGlow.geometry.dispose(); this._heatGlow.material.dispose(); }
        if (this._glossGlow) { scene.remove(this._glossGlow); this._glossGlow.geometry.dispose(); this._glossGlow.material.dispose(); }
        if (this._crystals) { this._crystals.forEach(function(c) { scene.remove(c); c.geometry.dispose(); c.material.dispose(); }); }
        if (this._shimmer) { this._shimmer.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._surface = this._blob = this._therm = this._thermFill = this._bulb = this._heatGlow = this._glossGlow = this._crystals = this._shimmer = null;
    }
};
