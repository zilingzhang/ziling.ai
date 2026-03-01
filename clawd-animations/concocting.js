export default {
    name: 'Concocting',
    label: 'concocting',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Beaker wireframe cylinder
        var beakerGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.35, 12, 1, true);
        var beakerMat = new THREE.MeshBasicMaterial({
            color: 0x88aacc, transparent: true, opacity: 0,
            wireframe: true
        });
        this._beaker = new THREE.Mesh(beakerGeo, beakerMat);
        this._beaker.position.set(ox - 0.3, oy - 0.08, 0);
        scene.add(this._beaker);

        // Beaker bottom disc
        var bottomGeo = new THREE.CircleGeometry(0.12, 12);
        var bottomMat = new THREE.MeshBasicMaterial({
            color: 0x667788, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._beakerBottom = new THREE.Mesh(bottomGeo, bottomMat);
        this._beakerBottom.position.set(ox - 0.3, oy - 0.255, 0);
        this._beakerBottom.rotation.x = Math.PI * 0.5;
        scene.add(this._beakerBottom);

        // Liquid disc (color will animate)
        var liquidGeo = new THREE.CircleGeometry(0.13, 16);
        var liquidMat = new THREE.MeshBasicMaterial({
            color: 0x4488ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._liquid = new THREE.Mesh(liquidGeo, liquidMat);
        this._liquid.position.set(ox - 0.3, oy - 0.1, 0);
        scene.add(this._liquid);

        // 3 ingredient spheres (drop sequentially)
        this._ingredients = [];
        var ingColors = [0xff4444, 0x44ff44, 0xffaa00];
        var ingNames = ['red', 'green', 'gold'];
        for (var i = 0; i < 3; i++) {
            var ingGeo = new THREE.SphereGeometry(0.03, 8, 8);
            var ingMat = new THREE.MeshBasicMaterial({
                color: ingColors[i], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ing = new THREE.Mesh(ingGeo, ingMat);
            ing.position.set(ox - 0.3 + (Math.random() - 0.5) * 0.05, oy + 0.3, 0.02);
            ing.visible = false;
            scene.add(ing);
            this._ingredients.push({
                mesh: ing,
                dropping: false,
                dropped: false,
                startY: oy + 0.3,
                targetY: oy - 0.1,
                colorName: ingNames[i]
            });
        }

        // 20 reaction bubble particles
        this._reactionBubbles = [];
        var bubGeo = new THREE.SphereGeometry(0.015, 5, 5);
        for (var j = 0; j < 20; j++) {
            var bMat = new THREE.MeshBasicMaterial({
                color: j % 4 === 0 ? 0xff6688 : (j % 4 === 1 ? 0x66ff88 : (j % 4 === 2 ? 0xffcc44 : 0x44aaff)),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bub = new THREE.Mesh(bubGeo, bMat);
            bub.visible = false;
            scene.add(bub);
            this._reactionBubbles.push({
                mesh: bub, life: 0, maxLife: 0,
                vx: 0, vy: 0, startScale: 0.3
            });
        }
        this._bubIdx = 0;
        this._lastBub = 0;

        // 10 vapor particles
        this._vaporParticles = [];
        var vapGeo = new THREE.SphereGeometry(0.025, 5, 5);
        for (var k = 0; k < 10; k++) {
            var vMat = new THREE.MeshBasicMaterial({
                color: 0xccddff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var vap = new THREE.Mesh(vapGeo, vMat);
            vap.visible = false;
            scene.add(vap);
            this._vaporParticles.push({
                mesh: vap, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._vapIdx = 0;

        // Concoction glow
        var glowGeo = new THREE.SphereGeometry(0.25, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xff88cc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox - 0.3, oy - 0.08, -0.05);
        scene.add(this._glow);

        this._liquidColorPhase = 0;
        this._ingredientCount = 0;
    },
    _spawnBubble(x, y, speed) {
        var b = this._reactionBubbles[this._bubIdx % this._reactionBubbles.length];
        this._bubIdx++;
        b.mesh.visible = true;
        b.mesh.position.set(
            x + (Math.random() - 0.5) * 0.2,
            y,
            (Math.random() - 0.5) * 0.05
        );
        b.vx = (Math.random() - 0.5) * 0.1;
        b.vy = speed + Math.random() * 0.3;
        b.life = 0.4 + Math.random() * 0.5;
        b.maxLife = b.life;
        b.startScale = 0.3 + Math.random() * 0.4;
        b.mesh.material.opacity = 0.8;
    },
    _spawnVapor(x, y) {
        var v = this._vaporParticles[this._vapIdx % this._vaporParticles.length];
        this._vapIdx++;
        v.mesh.visible = true;
        v.mesh.position.set(x + (Math.random() - 0.5) * 0.12, y, 0);
        v.vx = (Math.random() - 0.5) * 0.15;
        v.vy = 0.3 + Math.random() * 0.2;
        v.life = 0.7 + Math.random() * 0.4;
        v.maxLife = v.life;
        v.mesh.material.opacity = 0.4;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;
        var beakerX = ox - 0.3;
        var liquidY = oy - 0.1;

        // Liquid color shifts based on ingredients added
        this._liquidColorPhase += delta * 0.5;
        var lr, lg, lb;
        if (this._ingredientCount === 0) {
            lr = 0.25; lg = 0.5; lb = 1.0; // blue
        } else if (this._ingredientCount === 1) {
            lr = 0.7; lg = 0.3; lb = 0.8; // purple-ish
        } else if (this._ingredientCount === 2) {
            lr = 0.4; lg = 0.9; lb = 0.5; // green-ish
        } else {
            lr = 1.0; lg = 0.6 + Math.sin(this._liquidColorPhase * 3) * 0.2; lb = 0.3; // golden shifting
        }
        this._liquid.material.color.setRGB(lr, lg, lb);

        if (progress < 0.08) {
            // Phase 1: Beaker appears
            var t = progress / 0.08;
            var ease = t * t;
            this._beaker.material.opacity = ease * 0.5;
            this._beakerBottom.material.opacity = ease * 0.3;
            this._liquid.material.opacity = ease * 0.3;
            this._beaker.scale.setScalar(0.5 + ease * 0.5);
            this._beakerBottom.scale.setScalar(0.5 + ease * 0.5);

            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.22) {
            // Phase 2: First ingredient drops in
            var t2 = (progress - 0.08) / 0.14;
            this._beaker.material.opacity = 0.5;
            this._beakerBottom.material.opacity = 0.3;
            this._liquid.material.opacity = 0.4;

            var ing0 = this._ingredients[0];
            if (!ing0.dropped) {
                ing0.mesh.visible = true;
                var dropT = Math.min(1, t2 * 2);
                var dropEase = dropT * dropT;
                ing0.mesh.position.y = ing0.startY + (ing0.targetY - ing0.startY) * dropEase;
                ing0.mesh.material.opacity = 0.8;

                if (dropT >= 1 && !ing0.dropped) {
                    ing0.dropped = true;
                    ing0.mesh.visible = false;
                    this._ingredientCount = 1;
                }
            }

            // Small reaction
            if (t2 > 0.6 && time - this._lastBub > 0.2) {
                this._spawnBubble(beakerX, liquidY, 0.3);
                this._lastBub = time;
            }

            // Liquid wobble
            this._liquid.position.y = liquidY + Math.sin(time * 4) * 0.005;
            model.position.set(ox + 0.15, oy + Math.sin(time * 1.5) * 0.005, oz);
        } else if (progress < 0.38) {
            // Phase 3: Second ingredient, new color
            var t3 = (progress - 0.22) / 0.16;
            this._liquid.material.opacity = 0.5;

            var ing1 = this._ingredients[1];
            if (!ing1.dropped) {
                ing1.mesh.visible = true;
                var dropT2 = Math.min(1, t3 * 2);
                var dropEase2 = dropT2 * dropT2;
                ing1.mesh.position.y = ing1.startY + (ing1.targetY - ing1.startY) * dropEase2;
                ing1.mesh.material.opacity = 0.8;

                if (dropT2 >= 1) {
                    ing1.dropped = true;
                    ing1.mesh.visible = false;
                    this._ingredientCount = 2;
                }
            }

            // More bubbles
            if (time - this._lastBub > 0.15) {
                this._spawnBubble(beakerX, liquidY, 0.4);
                this._lastBub = time;
            }

            this._liquid.position.y = liquidY + Math.sin(time * 5) * 0.008;
            model.position.set(ox + 0.15, oy + Math.sin(time * 1.5) * 0.005, oz);
            model.rotation.z = Math.sin(time * 0.8) * 0.02;
        } else if (progress < 0.55) {
            // Phase 4: Third ingredient, vigorous bubbling
            var t4 = (progress - 0.38) / 0.17;
            this._liquid.material.opacity = 0.6;

            var ing2 = this._ingredients[2];
            if (!ing2.dropped) {
                ing2.mesh.visible = true;
                var dropT3 = Math.min(1, t4 * 2.5);
                var dropEase3 = dropT3 * dropT3;
                ing2.mesh.position.y = ing2.startY + (ing2.targetY - ing2.startY) * dropEase3;
                ing2.mesh.material.opacity = 0.8;

                if (dropT3 >= 1) {
                    ing2.dropped = true;
                    ing2.mesh.visible = false;
                    this._ingredientCount = 3;
                }
            }

            // Vigorous bubbles
            if (time - this._lastBub > 0.07) {
                this._spawnBubble(beakerX, liquidY, 0.5 + t4 * 0.3);
                if (t4 > 0.5) {
                    this._spawnBubble(beakerX, liquidY, 0.6);
                }
                this._lastBub = time;
            }

            // Liquid wobbles intensely
            this._liquid.position.y = liquidY + Math.sin(time * 6) * 0.012;
            this._liquid.scale.setScalar(1 + Math.sin(time * 5) * 0.04);

            model.position.set(ox + 0.15, oy + Math.sin(time * 1.5) * 0.008, oz);
            model.rotation.z = Math.sin(time * 1) * 0.03;
        } else if (progress < 0.72) {
            // Phase 5: Reaction builds, vapor rises
            var t5 = (progress - 0.55) / 0.17;

            // Rapid bubbles + vapor
            if (time - this._lastBub > 0.05) {
                this._spawnBubble(beakerX, liquidY, 0.6 + t5 * 0.4);
                this._spawnBubble(beakerX, liquidY, 0.5);
                this._lastBub = time;
            }

            // Vapor spawns
            if (Math.random() < 0.08 + t5 * 0.1) {
                this._spawnVapor(beakerX, liquidY + 0.1);
            }

            this._liquid.material.opacity = 0.6 + Math.sin(time * 5) * 0.1;
            this._liquid.position.y = liquidY + Math.sin(time * 7) * 0.015;
            this._liquid.scale.setScalar(1 + Math.sin(time * 6) * 0.05);

            // Glow starts building
            this._glow.material.opacity = t5 * 0.15;
            this._glow.scale.setScalar(1 + t5 * 0.3);

            model.position.set(ox + 0.15 + t5 * 0.03, oy, oz);
            model.rotation.z = -t5 * 0.04;
        } else if (progress < 0.85) {
            // Phase 6: Concoction complete, bright glow
            var t6 = (progress - 0.72) / 0.13;
            var completePulse = Math.sin(t6 * Math.PI);

            this._glow.material.opacity = 0.15 + completePulse * 0.2;
            this._glow.scale.setScalar(1.3 + completePulse * 0.6);
            this._glow.material.color.setHex(0xffaa44);

            // Still bubbling
            if (time - this._lastBub > 0.06) {
                this._spawnBubble(beakerX, liquidY, 0.8);
                this._lastBub = time;
            }

            // Lots of vapor
            if (Math.random() < 0.15) {
                this._spawnVapor(beakerX, liquidY + 0.1);
            }

            this._liquid.material.opacity = 0.7 + completePulse * 0.2;
            this._beaker.material.color.setHex(0xccddee);

            model.position.set(ox + 0.18, oy + completePulse * 0.02, oz);
            model.rotation.z = -0.04 + completePulse * 0.02;
        } else {
            // Phase 7: Fade
            var t7 = (progress - 0.85) / 0.15;

            this._beaker.material.opacity = 0.5 * (1 - t7);
            this._beakerBottom.material.opacity = 0.3 * (1 - t7);
            this._liquid.material.opacity = 0.7 * (1 - t7);
            this._glow.material.opacity = 0.2 * (1 - t7);
            this._glow.scale.setScalar(1.9 + t7 * 0.5);

            model.position.set(ox + 0.18 * (1 - t7), oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update reaction bubbles
        for (var bi = 0; bi < this._reactionBubbles.length; bi++) {
            var bb = this._reactionBubbles[bi];
            if (bb.life <= 0) continue;
            bb.life -= delta;
            if (bb.life <= 0) { bb.mesh.visible = false; continue; }
            bb.mesh.position.x += bb.vx * delta;
            bb.mesh.position.y += bb.vy * delta;
            bb.mesh.position.x += Math.sin(time * 8 + bi) * 0.002;
            var blr = bb.life / bb.maxLife;
            bb.mesh.material.opacity = blr * 0.7;
            bb.mesh.scale.setScalar(bb.startScale + (1 - blr) * 0.3);
        }

        // Update vapor particles
        for (var vi = 0; vi < this._vaporParticles.length; vi++) {
            var vv = this._vaporParticles[vi];
            if (vv.life <= 0) continue;
            vv.life -= delta;
            if (vv.life <= 0) { vv.mesh.visible = false; continue; }
            vv.mesh.position.x += vv.vx * delta;
            vv.mesh.position.y += vv.vy * delta;
            vv.mesh.position.x += Math.sin(time * 3 + vi * 2) * 0.003;
            var vlr = vv.life / vv.maxLife;
            vv.mesh.material.opacity = vlr * 0.3;
            vv.mesh.scale.setScalar(0.6 + (1 - vlr) * 1.2);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._beaker) { scene.remove(this._beaker); this._beaker.geometry.dispose(); this._beaker.material.dispose(); }
        if (this._beakerBottom) { scene.remove(this._beakerBottom); this._beakerBottom.geometry.dispose(); this._beakerBottom.material.dispose(); }
        if (this._liquid) { scene.remove(this._liquid); this._liquid.geometry.dispose(); this._liquid.material.dispose(); }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        if (this._ingredients) {
            this._ingredients.forEach(function(ing) {
                scene.remove(ing.mesh); ing.mesh.geometry.dispose(); ing.mesh.material.dispose();
            });
        }
        if (this._reactionBubbles) {
            this._reactionBubbles.forEach(function(b) {
                scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose();
            });
        }
        if (this._vaporParticles) {
            this._vaporParticles.forEach(function(v) {
                scene.remove(v.mesh); v.mesh.geometry.dispose(); v.mesh.material.dispose();
            });
        }
        this._beaker = this._beakerBottom = this._liquid = this._glow = null;
        this._ingredients = this._reactionBubbles = this._vaporParticles = null;
    }
};
