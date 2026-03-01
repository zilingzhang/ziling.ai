export default {
    name: 'Cooking',
    label: 'cooking',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Pan (flat cylinder)
        var panGeo = new THREE.CylinderGeometry(0.28, 0.26, 0.04, 18);
        var panMat = new THREE.MeshBasicMaterial({
            color: 0x555555, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._pan = new THREE.Mesh(panGeo, panMat);
        this._pan.position.set(ox - 0.25, oy - 0.22, 0);
        this._pan.rotation.x = Math.PI * 0.5;
        scene.add(this._pan);

        // Pan handle
        var handleGeo = new THREE.BoxGeometry(0.28, 0.025, 0.035);
        var handleMat = new THREE.MeshBasicMaterial({
            color: 0x444444, transparent: true, opacity: 0
        });
        this._handle = new THREE.Mesh(handleGeo, handleMat);
        this._handle.position.set(ox - 0.25 + 0.38, oy - 0.22, 0);
        scene.add(this._handle);

        // Flame particles underneath
        this._flames = [];
        var flameGeo = new THREE.SphereGeometry(0.02, 5, 5);
        for (var i = 0; i < 20; i++) {
            var fMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0xff6600 : (i % 3 === 1 ? 0xffaa00 : 0xff2200),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var fl = new THREE.Mesh(flameGeo, fMat);
            fl.visible = false;
            scene.add(fl);
            this._flames.push({
                mesh: fl, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._flameIdx = 0;

        // Ingredients (small varied shapes)
        this._ingredients = [];
        var shapes = [
            new THREE.BoxGeometry(0.035, 0.035, 0.035),
            new THREE.SphereGeometry(0.025, 6, 6),
            new THREE.CylinderGeometry(0.02, 0.02, 0.04, 6),
            new THREE.TetrahedronGeometry(0.03)
        ];
        var colors = [0xcc3333, 0x33aa33, 0xffaa33, 0xdddd33, 0xff6644, 0x88cc44];
        for (var j = 0; j < 8; j++) {
            var iGeo = shapes[j % shapes.length];
            var iMat = new THREE.MeshBasicMaterial({
                color: colors[j % colors.length], transparent: true, opacity: 0
            });
            var ingr = new THREE.Mesh(iGeo, iMat);
            ingr.position.set(
                ox - 0.25 + (Math.random() - 0.5) * 0.25,
                oy + 0.15 + j * 0.04,
                (Math.random() - 0.5) * 0.1
            );
            ingr.userData.placed = false;
            ingr.userData.tossPhase = 0;
            scene.add(ingr);
            this._ingredients.push(ingr);
        }

        // Sizzle particles
        this._sizzle = [];
        var sizzGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var k = 0; k < 25; k++) {
            var szMat = new THREE.MeshBasicMaterial({
                color: 0xffdd44, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sz = new THREE.Mesh(sizzGeo, szMat);
            sz.visible = false;
            scene.add(sz);
            this._sizzle.push({
                mesh: sz, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._sizzIdx = 0;

        // Aromatic wisps
        this._wisps = [];
        var wispGeo = new THREE.SphereGeometry(0.025, 6, 6);
        for (var w = 0; w < 12; w++) {
            var wMat = new THREE.MeshBasicMaterial({
                color: 0xffeecc, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var wMesh = new THREE.Mesh(wispGeo, wMat);
            wMesh.visible = false;
            scene.add(wMesh);
            this._wisps.push({
                mesh: wMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, baseX: 0
            });
        }
        this._wispIdx = 0;

        // Oil shimmer disc on pan
        var shimmerGeo = new THREE.CircleGeometry(0.24, 16);
        var shimmerMat = new THREE.MeshBasicMaterial({
            color: 0xffcc66, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._shimmer = new THREE.Mesh(shimmerGeo, shimmerMat);
        this._shimmer.position.set(ox - 0.25, oy - 0.20, 0);
        scene.add(this._shimmer);

        this._lastFlame = 0;
    },
    _spawnFlame(x, y) {
        var f = this._flames[this._flameIdx % this._flames.length];
        this._flameIdx++;
        f.mesh.visible = true;
        f.mesh.position.set(x + (Math.random() - 0.5) * 0.35, y, (Math.random() - 0.5) * 0.08);
        f.vx = (Math.random() - 0.5) * 0.05;
        f.vy = 0.4 + Math.random() * 0.3;
        f.life = 0.2 + Math.random() * 0.2;
        f.maxLife = f.life;
        f.mesh.material.opacity = 0.6;
    },
    _spawnSizzle(x, y) {
        var s = this._sizzle[this._sizzIdx % this._sizzle.length];
        this._sizzIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x, y, 0);
        s.vx = (Math.random() - 0.5) * 0.8;
        s.vy = 0.3 + Math.random() * 0.5;
        s.life = 0.15 + Math.random() * 0.2;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.8;
    },
    _spawnWisp(x, y) {
        var w = this._wisps[this._wispIdx % this._wisps.length];
        this._wispIdx++;
        w.mesh.visible = true;
        w.mesh.position.set(x + (Math.random() - 0.5) * 0.15, y, 0);
        w.baseX = w.mesh.position.x;
        w.vx = 0;
        w.vy = 0.3 + Math.random() * 0.25;
        w.life = 0.8 + Math.random() * 0.5;
        w.maxLife = w.life;
        w.mesh.material.opacity = 0.3;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var panX = ox - 0.25;
        var panY = oy - 0.22;

        // Always animate flames when pan visible
        if (progress > 0.08 && progress < 0.88) {
            if (time - this._lastFlame > 0.06) {
                this._spawnFlame(panX, panY - 0.04);
                this._lastFlame = time;
            }
        }

        if (progress < 0.08) {
            // Phase 1: Pan appears
            var t = progress / 0.08;
            var ease = t * t;
            this._pan.material.opacity = ease * 0.7;
            this._handle.material.opacity = ease * 0.6;
            this._shimmer.material.opacity = ease * 0.15;
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.30) {
            // Phase 2: Oil heats, ingredients drop in one by one
            var t2 = (progress - 0.08) / 0.22;
            this._pan.material.opacity = 0.7;
            this._handle.material.opacity = 0.6;
            this._shimmer.material.opacity = 0.15 + t2 * 0.1 + Math.sin(time * 8) * 0.05;

            // Drop ingredients one by one
            var numToDrop = Math.floor(t2 * this._ingredients.length);
            for (var i = 0; i < this._ingredients.length; i++) {
                var ingr = this._ingredients[i];
                if (i < numToDrop) {
                    if (!ingr.userData.placed) {
                        ingr.userData.placed = true;
                        // Sizzle burst on landing
                        for (var sz = 0; sz < 3; sz++) {
                            this._spawnSizzle(
                                panX + (Math.random() - 0.5) * 0.2,
                                panY + 0.03
                            );
                        }
                    }
                    ingr.position.set(
                        panX + (Math.random() * 0.001 - 0.0005) + ((i % 3) - 1) * 0.08,
                        panY + 0.02,
                        (Math.random() * 0.001 - 0.0005)
                    );
                    ingr.material.opacity = 0.8;
                } else if (i === numToDrop) {
                    // Currently falling
                    var fallT = (t2 * this._ingredients.length) - numToDrop;
                    ingr.position.y = oy + 0.15 - fallT * 0.37;
                    ingr.material.opacity = 0.8;
                } else {
                    ingr.material.opacity = 0;
                }
            }

            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.60) {
            // Phase 3: Sizzling, model stirs, aromatic wisps
            var t3 = (progress - 0.30) / 0.30;
            this._shimmer.material.opacity = 0.25 + Math.sin(time * 10) * 0.08;

            // All ingredients in pan, sizzling
            for (var j = 0; j < this._ingredients.length; j++) {
                var ing = this._ingredients[j];
                ing.material.opacity = 0.8;
                ing.position.set(
                    panX + ((j % 3) - 1) * 0.08 + Math.sin(time * 5 + j) * 0.01,
                    panY + 0.02 + Math.abs(Math.sin(time * 3 + j * 0.8)) * 0.01,
                    0
                );
                // Color darkens (searing)
                var sear = t3 * 0.3;
                var origColor = ing.material.color;
                ing.material.color.setRGB(
                    Math.max(0.2, origColor.r - sear * 0.01),
                    Math.max(0.2, origColor.g - sear * 0.01),
                    Math.max(0.1, origColor.b - sear * 0.01)
                );
            }

            // Sizzle particles
            if (Math.random() < 0.15) {
                this._spawnSizzle(panX + (Math.random() - 0.5) * 0.3, panY + 0.03);
            }

            // Aromatic wisps
            if (Math.random() < 0.06 + t3 * 0.04) {
                this._spawnWisp(panX, panY + 0.06);
            }

            // Model stirs - orbital motion
            var stirAngle = time * 2;
            model.position.set(
                ox + 0.15 + Math.cos(stirAngle) * 0.03,
                oy + Math.sin(stirAngle) * 0.02,
                oz
            );
            model.rotation.z = Math.sin(stirAngle) * 0.06;
        } else if (progress < 0.80) {
            // Phase 4: Toss/flip - ingredients fly up
            var t4 = (progress - 0.60) / 0.20;
            var flipCycle = Math.sin(t4 * Math.PI * 2);

            for (var k = 0; k < this._ingredients.length; k++) {
                var flipIngr = this._ingredients[k];
                var flipOffset = k * 0.12;
                var localFlip = Math.sin((t4 + flipOffset * 0.1) * Math.PI * 2);
                var tossHeight = Math.max(0, localFlip) * 0.15;
                flipIngr.position.set(
                    panX + ((k % 3) - 1) * 0.08 + Math.sin(time * 3 + k) * 0.015,
                    panY + 0.02 + tossHeight,
                    0
                );
                flipIngr.rotation.x += delta * 3;
                flipIngr.rotation.z += delta * 2;

                // Sizzle on landing
                if (tossHeight < 0.01 && localFlip > -0.1 && Math.random() < 0.1) {
                    this._spawnSizzle(flipIngr.position.x, panY + 0.03);
                }
            }

            // More wisps during high heat
            if (Math.random() < 0.08) {
                this._spawnWisp(panX, panY + 0.08);
            }

            // Model flips pan
            model.position.set(ox + 0.15, oy + flipCycle * 0.02, oz);
            model.rotation.z = flipCycle * 0.04;

            // Pan tilts slightly with flip
            this._pan.rotation.z = flipCycle * 0.03;
        } else if (progress < 0.90) {
            // Phase 5: Final presentation
            var t5 = (progress - 0.80) / 0.10;
            this._pan.rotation.z = 0;

            for (var m = 0; m < this._ingredients.length; m++) {
                this._ingredients[m].position.set(
                    panX + ((m % 3) - 1) * 0.08,
                    panY + 0.02,
                    0
                );
                this._ingredients[m].rotation.set(0, 0, 0);
            }

            // Gentle wisps
            if (Math.random() < 0.04) {
                this._spawnWisp(panX, panY + 0.05);
            }

            model.position.set(ox + 0.15, oy, oz);
            model.rotation.z = 0;
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.90) / 0.10;
            this._pan.material.opacity = 0.7 * (1 - t6);
            this._handle.material.opacity = 0.6 * (1 - t6);
            this._shimmer.material.opacity = 0.25 * (1 - t6);
            for (var n = 0; n < this._ingredients.length; n++) {
                this._ingredients[n].material.opacity = 0.8 * (1 - t6);
            }

            model.position.set(ox + 0.15 * (1 - t6), oy, oz);
            model.scale.copy(this._origScale);
        }

        // Update flames
        for (var fi = 0; fi < this._flames.length; fi++) {
            var fl = this._flames[fi];
            if (fl.life <= 0) continue;
            fl.life -= delta;
            if (fl.life <= 0) { fl.mesh.visible = false; continue; }
            fl.mesh.position.x += fl.vx * delta;
            fl.mesh.position.y += fl.vy * delta;
            var flr = fl.life / fl.maxLife;
            fl.mesh.material.opacity = flr * 0.5;
            fl.mesh.scale.setScalar(0.8 + (1 - flr) * 0.5);
        }

        // Update sizzle
        for (var si = 0; si < this._sizzle.length; si++) {
            var ss = this._sizzle[si];
            if (ss.life <= 0) continue;
            ss.life -= delta;
            if (ss.life <= 0) { ss.mesh.visible = false; continue; }
            ss.mesh.position.x += ss.vx * delta;
            ss.mesh.position.y += ss.vy * delta;
            var slr = ss.life / ss.maxLife;
            ss.mesh.material.opacity = slr * 0.7;
            ss.mesh.scale.setScalar(0.4 + (1 - slr) * 0.6);
        }

        // Update wisps
        for (var wi = 0; wi < this._wisps.length; wi++) {
            var ww = this._wisps[wi];
            if (ww.life <= 0) continue;
            ww.life -= delta;
            if (ww.life <= 0) { ww.mesh.visible = false; continue; }
            ww.mesh.position.y += ww.vy * delta;
            ww.mesh.position.x = ww.baseX + Math.sin(time * 3 + wi * 2) * 0.04;
            var wlr = ww.life / ww.maxLife;
            ww.mesh.material.opacity = wlr * 0.25;
            ww.mesh.scale.setScalar(0.6 + (1 - wlr) * 1.8);
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
        if (this._ingredients) { this._ingredients.forEach(function(ig) { scene.remove(ig); ig.geometry.dispose(); ig.material.dispose(); }); }
        if (this._flames) { this._flames.forEach(function(f) { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); }); }
        if (this._sizzle) { this._sizzle.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._wisps) { this._wisps.forEach(function(w) { scene.remove(w.mesh); w.mesh.geometry.dispose(); w.mesh.material.dispose(); }); }
        this._pan = this._handle = this._shimmer = this._ingredients = this._flames = this._sizzle = this._wisps = null;
    }
};
