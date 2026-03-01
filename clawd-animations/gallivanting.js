export default {
    name: 'Gallivanting',
    label: 'gallivanting',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Confetti particles
        this._confetti = [];
        var confGeo = new THREE.PlaneGeometry(0.025, 0.025);
        for (var i = 0; i < 25; i++) {
            var confColors = [0xff4488, 0x44ff88, 0x4488ff, 0xffff44, 0xff8844, 0xaa44ff, 0x44ffff];
            var cMat = new THREE.MeshBasicMaterial({
                color: confColors[i % confColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            var conf = new THREE.Mesh(confGeo, cMat);
            conf.visible = false;
            scene.add(conf);
            this._confetti.push({ mesh: conf, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0 });
        }
        this._confIdx = 0;

        // Flower trail spheres
        this._flowers = [];
        var flowerGeo = new THREE.SphereGeometry(0.025, 6, 6);
        for (var j = 0; j < 12; j++) {
            var flowerColors = [0xff88cc, 0xffaadd, 0xff66aa, 0xffccee, 0xee88bb, 0xffddee];
            var fMat = new THREE.MeshBasicMaterial({
                color: flowerColors[j % flowerColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var flower = new THREE.Mesh(flowerGeo, fMat);
            flower.visible = false;
            scene.add(flower);
            this._flowers.push({ mesh: flower, placed: false });
        }
        this._flowerIdx = 0;
        this._lastConfetti = 0;
        this._lastFlower = 0;
    },
    _emitConfetti(x, y, burst) {
        var count = burst ? 6 : 2;
        for (var i = 0; i < count; i++) {
            var c = this._confetti[this._confIdx % this._confetti.length];
            this._confIdx++;
            c.mesh.visible = true;
            c.mesh.position.set(x + (Math.random() - 0.5) * 0.15, y + 0.1 + Math.random() * 0.1, (Math.random() - 0.5) * 0.1);
            var angle = Math.random() * Math.PI * 2;
            var spd = burst ? (1.5 + Math.random() * 2.0) : (0.5 + Math.random() * 1.0);
            c.vx = Math.cos(angle) * spd;
            c.vy = Math.sin(angle) * spd * 0.7 + 1.0;
            c.vz = (Math.random() - 0.5) * 0.5;
            c.rx = (Math.random() - 0.5) * 10;
            c.ry = (Math.random() - 0.5) * 10;
            c.life = 1.0 + Math.random() * 0.8;
            c.maxLife = c.life;
            c.mesh.material.opacity = 1.0;
        }
    },
    _placeFlower(x, y) {
        if (this._flowerIdx >= this._flowers.length) return;
        var f = this._flowers[this._flowerIdx];
        this._flowerIdx++;
        f.mesh.visible = true;
        f.mesh.position.set(x, y - 0.18, (Math.random() - 0.5) * 0.05);
        f.mesh.material.opacity = 0.8;
        f.mesh.scale.setScalar(0.01);
        f.placed = true;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        if (progress < 0.08) {
            // First hop preparation
            var t = progress / 0.08;
            model.position.set(orig.x, orig.y + Math.sin(t * Math.PI) * 0.1, orig.z);
            model.scale.set(gs * (1 - t * 0.05), gs * (1 + t * 0.08), gs);
        } else if (progress < 0.50) {
            // Circular prancing path with confetti
            var t2 = (progress - 0.08) / 0.42;
            var circAngle = t2 * Math.PI * 2;
            var radius = 0.5;
            var hopHeight = Math.abs(Math.sin(time * 7)) * 0.15;

            var px = orig.x + Math.sin(circAngle) * radius;
            var py = orig.y + hopHeight;

            model.position.set(px, py, orig.z);
            model.rotation.z = Math.sin(time * 7) * 0.12;

            // Exaggerated hop squash/stretch
            var hopPhase = Math.sin(time * 7);
            if (hopPhase > 0.7) {
                model.scale.set(gs * 0.92, gs * 1.1, gs);
            } else if (hopPhase < -0.7) {
                model.scale.set(gs * 1.06, gs * 0.92, gs);
            } else {
                model.scale.setScalar(gs);
            }

            if (time - this._lastConfetti > 0.12) {
                this._emitConfetti(px, py, false);
                this._lastConfetti = time;
            }

            if (time - this._lastFlower > 0.35 && this._flowerIdx < 6) {
                this._placeFlower(px, orig.y);
                this._lastFlower = time;
            }
        } else if (progress < 0.80) {
            // Figure-8 path with flowers
            var t3 = (progress - 0.50) / 0.30;
            var fig8Angle = t3 * Math.PI * 2;
            var fig8x = Math.sin(fig8Angle) * 0.6;
            var fig8y = Math.sin(fig8Angle * 2) * 0.2;
            var hopHeight2 = Math.abs(Math.sin(time * 8)) * 0.12;

            model.position.set(orig.x + fig8x, orig.y + fig8y + hopHeight2, orig.z);
            model.rotation.z = Math.cos(time * 8) * 0.1;

            var hopPhase2 = Math.sin(time * 8);
            if (hopPhase2 > 0.7) {
                model.scale.set(gs * 0.93, gs * 1.08, gs);
            } else {
                model.scale.setScalar(gs);
            }

            if (time - this._lastConfetti > 0.15) {
                this._emitConfetti(model.position.x, model.position.y, false);
                this._lastConfetti = time;
            }

            if (time - this._lastFlower > 0.3 && this._flowerIdx < this._flowers.length) {
                this._placeFlower(model.position.x, orig.y);
                this._lastFlower = time;
            }
        } else if (progress < 0.92) {
            // Return to center with confetti burst
            var t4 = (progress - 0.80) / 0.12;
            var returnX = model.position.x + (orig.x - model.position.x) * t4;
            var returnY = orig.y + Math.sin(t4 * Math.PI) * 0.2;

            model.position.set(returnX, returnY, orig.z);
            model.rotation.z = (1 - t4) * model.rotation.z;
            model.scale.setScalar(gs);

            // Big confetti burst at start of return
            if (t4 < 0.15 && time - this._lastConfetti > 0.05) {
                this._emitConfetti(model.position.x, model.position.y, true);
                this._lastConfetti = time;
            }

            // Fade flowers
            for (var fi = 0; fi < this._flowers.length; fi++) {
                var fl = this._flowers[fi];
                if (fl.placed) {
                    fl.mesh.material.opacity = 0.8 * (1 - t4);
                }
            }
        } else {
            // Rest
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            for (var fi2 = 0; fi2 < this._flowers.length; fi2++) {
                this._flowers[fi2].mesh.visible = false;
            }
        }

        // Grow placed flowers
        for (var gi = 0; gi < this._flowers.length; gi++) {
            var gf = this._flowers[gi];
            if (gf.placed && gf.mesh.visible) {
                var targetScale = 1.0;
                var currentScale = gf.mesh.scale.x;
                if (currentScale < targetScale) {
                    gf.mesh.scale.setScalar(Math.min(currentScale + delta * 3, targetScale));
                }
                // Gentle bob
                gf.mesh.position.y += Math.sin(time * 3 + gi) * 0.0003;
            }
        }

        // Update confetti particles
        for (var ci = 0; ci < this._confetti.length; ci++) {
            var cp = this._confetti[ci];
            if (cp.life <= 0) continue;
            cp.life -= delta;
            if (cp.life <= 0) { cp.mesh.visible = false; continue; }
            cp.mesh.position.x += cp.vx * delta;
            cp.mesh.position.y += cp.vy * delta;
            cp.mesh.position.z += cp.vz * delta;
            cp.vy -= 2.5 * delta;
            // Flutter effect
            cp.vx += Math.sin(time * 5 + ci) * 0.5 * delta;
            cp.mesh.rotation.x += cp.rx * delta;
            cp.mesh.rotation.y += cp.ry * delta;
            cp.mesh.material.opacity = cp.life / cp.maxLife;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._confetti) {
            this._confetti.forEach(function(c) {
                scene.remove(c.mesh);
                c.mesh.geometry.dispose();
                c.mesh.material.dispose();
            });
        }
        if (this._flowers) {
            this._flowers.forEach(function(f) {
                scene.remove(f.mesh);
                f.mesh.geometry.dispose();
                f.mesh.material.dispose();
            });
        }
        this._confetti = this._flowers = null;
    }
};
