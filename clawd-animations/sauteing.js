export default {
    name: 'Sauteing',
    label: 'sauteing',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Hot pan disc
        var panGeo = new THREE.CylinderGeometry(0.26, 0.24, 0.03, 18);
        var panMat = new THREE.MeshBasicMaterial({
            color: 0x666666, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._pan = new THREE.Mesh(panGeo, panMat);
        this._pan.position.set(ox - 0.25, oy - 0.22, 0);
        this._pan.rotation.x = Math.PI * 0.5;
        scene.add(this._pan);

        // Pan handle
        var handleGeo = new THREE.BoxGeometry(0.22, 0.02, 0.03);
        var handleMat = new THREE.MeshBasicMaterial({
            color: 0x555555, transparent: true, opacity: 0
        });
        this._handle = new THREE.Mesh(handleGeo, handleMat);
        this._handle.position.set(ox - 0.25 + 0.33, oy - 0.22, 0);
        scene.add(this._handle);

        // Oil shimmer
        var shimGeo = new THREE.CircleGeometry(0.22, 16);
        var shimMat = new THREE.MeshBasicMaterial({
            color: 0xffcc66, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._shimmer = new THREE.Mesh(shimGeo, shimMat);
        this._shimmer.position.set(ox - 0.25, oy - 0.21, 0);
        scene.add(this._shimmer);

        // Ingredients (small cubes)
        this._ingredients = [];
        var cubeGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        var cubeColors = [0xcc4444, 0x44aa44, 0xffbb33, 0xdddd44, 0xff8844, 0x88bb44];
        for (var i = 0; i < 8; i++) {
            var iMat = new THREE.MeshBasicMaterial({
                color: cubeColors[i % cubeColors.length], transparent: true, opacity: 0
            });
            var cube = new THREE.Mesh(cubeGeo, iMat);
            cube.userData.angle = (i / 8) * Math.PI * 2;
            cube.userData.dist = 0.06 + Math.random() * 0.08;
            cube.userData.tossPhase = 0;
            cube.userData.inPan = false;
            scene.add(cube);
            this._ingredients.push(cube);
        }

        // Sizzle particles
        this._sizzle = [];
        var sizzGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var j = 0; j < 25; j++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: j % 2 === 0 ? 0xffdd44 : 0xffaa22,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sMesh = new THREE.Mesh(sizzGeo, sMat);
            sMesh.visible = false;
            scene.add(sMesh);
            this._sizzle.push({
                mesh: sMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._sizzIdx = 0;

        // Smoke wisps
        this._smoke = [];
        var smokeGeo = new THREE.SphereGeometry(0.025, 6, 6);
        for (var k = 0; k < 10; k++) {
            var smMat = new THREE.MeshBasicMaterial({
                color: 0xcccccc, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var smMesh = new THREE.Mesh(smokeGeo, smMat);
            smMesh.visible = false;
            scene.add(smMesh);
            this._smoke.push({
                mesh: smMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, baseX: 0
            });
        }
        this._smokeIdx = 0;

        // Golden sear glow
        var searGeo = new THREE.CircleGeometry(0.2, 16);
        var searMat = new THREE.MeshBasicMaterial({
            color: 0xddaa33, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._searGlow = new THREE.Mesh(searGeo, searMat);
        this._searGlow.position.set(ox - 0.25, oy - 0.20, 0.01);
        scene.add(this._searGlow);
    },
    _spawnSizzle(x, y) {
        var s = this._sizzle[this._sizzIdx % this._sizzle.length];
        this._sizzIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x, y, 0);
        s.vx = (Math.random() - 0.5) * 0.8;
        s.vy = 0.3 + Math.random() * 0.5;
        s.life = 0.12 + Math.random() * 0.15;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.8;
    },
    _spawnSmoke(x, y) {
        var s = this._smoke[this._smokeIdx % this._smoke.length];
        this._smokeIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y, 0);
        s.baseX = s.mesh.position.x;
        s.vx = 0;
        s.vy = 0.25 + Math.random() * 0.2;
        s.life = 0.6 + Math.random() * 0.4;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.25;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var panX = ox - 0.25;
        var panY = oy - 0.21;

        if (progress < 0.08) {
            // Phase 1: Pan appears with oil shimmer
            var t = progress / 0.08;
            var ease = t * t;
            this._pan.material.opacity = ease * 0.7;
            this._handle.material.opacity = ease * 0.6;
            this._shimmer.material.opacity = ease * 0.15;
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.25) {
            // Phase 2: Oil heats, shimmer intensifies
            var t2 = (progress - 0.08) / 0.17;
            this._pan.material.opacity = 0.7;
            this._handle.material.opacity = 0.6;
            this._shimmer.material.opacity = 0.15 + t2 * 0.1 + Math.sin(time * 10) * 0.05;

            // Pan heats up (color shift)
            this._pan.material.color.setRGB(0.4 + t2 * 0.2, 0.4 + t2 * 0.05, 0.4 - t2 * 0.1);

            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.50) {
            // Phase 3: Toss ingredients with flip motion
            var t3 = (progress - 0.25) / 0.25;

            // Ingredients arc through air and land
            for (var i = 0; i < this._ingredients.length; i++) {
                var ingr = this._ingredients[i];
                var dropDelay = i / this._ingredients.length;
                var dropT = Math.max(0, Math.min((t3 - dropDelay * 0.5) / 0.5, 1));

                if (dropT > 0) {
                    ingr.material.opacity = 0.8;
                    if (dropT < 1) {
                        // Arc through air
                        var arcX = panX + 0.3 * (1 - dropT) + Math.cos(ingr.userData.angle) * ingr.userData.dist * dropT;
                        var arcY = panY + 0.25 * Math.sin(dropT * Math.PI) + 0.1 * (1 - dropT);
                        ingr.position.set(arcX, arcY, 0);
                        ingr.rotation.x += delta * 8;
                        ingr.rotation.z += delta * 6;
                    } else {
                        // Landed in pan
                        ingr.userData.inPan = true;
                        ingr.position.set(
                            panX + Math.cos(ingr.userData.angle) * ingr.userData.dist,
                            panY + 0.02,
                            0
                        );
                        // Sizzle on landing
                        if (!ingr.userData.sizzled) {
                            ingr.userData.sizzled = true;
                            for (var sz = 0; sz < 3; sz++) {
                                this._spawnSizzle(ingr.position.x, panY + 0.02);
                            }
                        }
                    }
                } else {
                    ingr.material.opacity = 0;
                }
            }

            // Model tosses motion
            var tossAngle = t3 * Math.PI;
            model.position.set(ox + 0.15, oy + Math.sin(tossAngle) * 0.03, oz);
            model.rotation.z = Math.sin(tossAngle) * 0.06;
        } else if (progress < 0.75) {
            // Phase 4: High-heat sauteing, items jostle, sizzle/smoke
            var t4 = (progress - 0.50) / 0.25;

            // Items jostle in pan with quick toss
            var flipCycle = Math.sin(time * 5);
            for (var j = 0; j < this._ingredients.length; j++) {
                var ing = this._ingredients[j];
                ing.material.opacity = 0.8;
                var jostleHeight = Math.max(0, Math.sin(time * 5 + j * 0.8)) * 0.08;
                ing.position.set(
                    panX + Math.cos(ing.userData.angle + time * 0.5) * ing.userData.dist,
                    panY + 0.02 + jostleHeight,
                    0
                );
                ing.rotation.x += delta * (jostleHeight > 0.01 ? 5 : 0.5);

                // Sizzle on landing
                if (jostleHeight < 0.005 && Math.random() < 0.05) {
                    this._spawnSizzle(ing.position.x, panY + 0.02);
                }
            }

            // Sear glow
            this._searGlow.material.opacity = t4 * 0.2 + Math.sin(time * 8) * 0.05;

            // Smoke wisps
            if (Math.random() < 0.05 + t4 * 0.04) {
                this._spawnSmoke(panX, panY + 0.05);
            }

            // Model does flip motion
            model.position.set(ox + 0.15, oy + flipCycle * 0.015, oz);
            model.rotation.z = flipCycle * 0.03;
        } else if (progress < 0.88) {
            // Phase 5: Golden sear complete
            var t5 = (progress - 0.75) / 0.13;

            // Items settle with golden color
            for (var k = 0; k < this._ingredients.length; k++) {
                var settled = this._ingredients[k];
                settled.position.set(
                    panX + Math.cos(settled.userData.angle) * settled.userData.dist,
                    panY + 0.02,
                    0
                );
                // Darken slightly (seared)
                settled.rotation.set(0, 0, 0);
            }

            this._searGlow.material.opacity = 0.2 * (1 - t5 * 0.5);

            // Light smoke
            if (Math.random() < 0.03) {
                this._spawnSmoke(panX, panY + 0.04);
            }

            model.position.set(ox + 0.15, oy, oz);
            model.rotation.z = 0;
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.88) / 0.12;
            this._pan.material.opacity = 0.7 * (1 - t6);
            this._handle.material.opacity = 0.6 * (1 - t6);
            this._shimmer.material.opacity = 0.2 * (1 - t6);
            this._searGlow.material.opacity = 0.1 * (1 - t6);
            for (var m = 0; m < this._ingredients.length; m++) {
                this._ingredients[m].material.opacity = 0.8 * (1 - t6);
            }

            model.position.set(ox + 0.15 * (1 - t6), oy, oz);
            model.scale.copy(this._origScale);
        }

        // Update sizzle
        for (var si = 0; si < this._sizzle.length; si++) {
            var sz2 = this._sizzle[si];
            if (sz2.life <= 0) continue;
            sz2.life -= delta;
            if (sz2.life <= 0) { sz2.mesh.visible = false; continue; }
            sz2.mesh.position.x += sz2.vx * delta;
            sz2.mesh.position.y += sz2.vy * delta;
            var slr = sz2.life / sz2.maxLife;
            sz2.mesh.material.opacity = slr * 0.7;
            sz2.mesh.scale.setScalar(0.4 + (1 - slr) * 0.6);
        }

        // Update smoke
        for (var smi = 0; smi < this._smoke.length; smi++) {
            var sm = this._smoke[smi];
            if (sm.life <= 0) continue;
            sm.life -= delta;
            if (sm.life <= 0) { sm.mesh.visible = false; continue; }
            sm.mesh.position.y += sm.vy * delta;
            sm.mesh.position.x = sm.baseX + Math.sin(time * 2.5 + smi * 2) * 0.03;
            var smlr = sm.life / sm.maxLife;
            sm.mesh.material.opacity = smlr * 0.2;
            sm.mesh.scale.setScalar(0.5 + (1 - smlr) * 2.0);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._pan) { scene.remove(this._pan); this._pan.geometry.dispose(); this._pan.material.dispose(); }
        if (this._handle) { scene.remove(this._handle); this._handle.geometry.dispose(); this._handle.material.dispose(); }
        if (this._shimmer) { scene.remove(this._shimmer); this._shimmer.geometry.dispose(); this._shimmer.material.dispose(); }
        if (this._searGlow) { scene.remove(this._searGlow); this._searGlow.geometry.dispose(); this._searGlow.material.dispose(); }
        if (this._ingredients) { this._ingredients.forEach(function(ig) { scene.remove(ig); ig.geometry.dispose(); ig.material.dispose(); }); }
        if (this._sizzle) { this._sizzle.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._smoke) { this._smoke.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._pan = this._handle = this._shimmer = this._searGlow = this._ingredients = this._sizzle = this._smoke = null;
    }
};
