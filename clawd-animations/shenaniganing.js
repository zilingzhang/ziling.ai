import { cloneWithMaterials, setCloneOpacity, disposeClone } from './helpers.js';

export default {
    name: 'Shenaniganing',
    label: 'shenaniganing',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var gs = this._origScale.x;

        // Decoy clone (waves to distract)
        this._decoy = cloneWithMaterials(model);
        this._decoy.scale.setScalar(gs);
        setCloneOpacity(this._decoy, 0);
        this._decoy.visible = false;
        scene.add(this._decoy);

        // Sneaker clone (sneaks around planting pranks)
        this._sneaker = cloneWithMaterials(model);
        this._sneaker.scale.setScalar(gs);
        setCloneOpacity(this._sneaker, 0);
        this._sneaker.visible = false;
        scene.add(this._sneaker);

        // Prank box (small ticking box)
        var boxGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
        var boxMat = new THREE.MeshBasicMaterial({
            color: 0xff4444, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._prankBox = new THREE.Mesh(boxGeo, boxMat);
        this._prankBox.visible = false;
        this._prankBox.position.set(this._origPos.x + 0.5, this._origPos.y - 0.15, 0);
        scene.add(this._prankBox);

        // Prank box fuse/tick indicator (small sphere on top)
        var fuseGeo = new THREE.SphereGeometry(0.015, 6, 6);
        var fuseMat = new THREE.MeshBasicMaterial({
            color: 0xffff44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._fuse = new THREE.Mesh(fuseGeo, fuseMat);
        this._fuse.visible = false;
        scene.add(this._fuse);

        // Sparkle distraction particles (for decoy)
        this._sparkles = [];
        var spkGeo = new THREE.OctahedronGeometry(0.015, 0);
        for (var i = 0; i < 10; i++) {
            var spkColors = [0xffff88, 0xffffcc, 0xffee44, 0xffffff, 0xffdd66];
            var spkMat = new THREE.MeshBasicMaterial({
                color: spkColors[i % spkColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spk = new THREE.Mesh(spkGeo, spkMat);
            spk.visible = false;
            scene.add(spk);
            this._sparkles.push({ mesh: spk, life: 0, maxLife: 0, vx: 0, vy: 0, angle: 0 });
        }
        this._spkIdx = 0;
        this._lastSparkle = 0;

        // Confetti particles (for prank explosion)
        this._confetti = [];
        var confGeo = new THREE.PlaneGeometry(0.02, 0.02);
        for (var j = 0; j < 20; j++) {
            var confColors = [0xff4488, 0x44ff88, 0x4488ff, 0xffff44, 0xff8844,
                              0xaa44ff, 0x44ffff, 0xff44ff, 0x88ff44, 0xffaa88,
                              0xff6644, 0x44aaff, 0xaaff44, 0xff44aa, 0x6644ff,
                              0x44ffaa, 0xffcc44, 0xcc44ff, 0x44ff44, 0xff4444];
            var cMat = new THREE.MeshBasicMaterial({
                color: confColors[j], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
                side: THREE.DoubleSide
            });
            var conf = new THREE.Mesh(confGeo, cMat);
            conf.visible = false;
            scene.add(conf);
            this._confetti.push({ mesh: conf, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0 });
        }

        // Explosion flash
        var flashGeo = new THREE.SphereGeometry(0.2, 10, 10);
        var flashMat = new THREE.MeshBasicMaterial({
            color: 0xffaa44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._explosionFlash = new THREE.Mesh(flashGeo, flashMat);
        this._explosionFlash.position.copy(this._prankBox.position);
        scene.add(this._explosionFlash);

        this._exploded = false;
    },
    _emitSparkle(x, y) {
        var s = this._sparkles[this._spkIdx % this._sparkles.length];
        this._spkIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x + (Math.random() - 0.5) * 0.15, y + Math.random() * 0.15, 0);
        s.vx = (Math.random() - 0.5) * 0.5;
        s.vy = 0.8 + Math.random() * 0.8;
        s.mesh.material.opacity = 0.8;
        s.life = 0.4 + Math.random() * 0.3;
        s.maxLife = s.life;
        s.angle = Math.random() * Math.PI * 2;
    },
    _explodeConfetti(x, y) {
        for (var i = 0; i < 20; i++) {
            var c = this._confetti[i];
            c.mesh.visible = true;
            c.mesh.position.set(x, y, 0);
            var a = Math.random() * Math.PI * 2;
            var spd = 1.5 + Math.random() * 3.0;
            c.vx = Math.cos(a) * spd;
            c.vy = Math.sin(a) * spd * 0.8 + 1.5;
            c.vz = (Math.random() - 0.5) * 1.0;
            c.rx = (Math.random() - 0.5) * 12;
            c.ry = (Math.random() - 0.5) * 12;
            c.life = 1.0 + Math.random() * 0.8;
            c.maxLife = c.life;
            c.mesh.material.opacity = 1.0;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.10) {
            // Phase 1: Model splits into two
            var t = progress / 0.10;
            var splitDist = t * 0.3;
            model.visible = true;

            // Original model slides left (becomes sneaker)
            model.position.set(ox - splitDist, oy, oz);
            model.scale.setScalar(gs);

            // Decoy fades in and slides right
            this._decoy.visible = true;
            setCloneOpacity(this._decoy, t * 0.8);
            this._decoy.position.set(ox + splitDist, oy, 0);
            this._decoy.scale.setScalar(gs);

            // Sneaker fades in overlapping model
            this._sneaker.visible = true;
            setCloneOpacity(this._sneaker, t * 0.5);
            this._sneaker.position.set(ox - splitDist, oy, 0);
        } else if (progress < 0.30) {
            // Phase 2: Decoy waves, sneaker sneaks
            var t2 = (progress - 0.10) / 0.20;

            // Hide original model, use clones
            model.visible = false;

            // Decoy stays put and "waves" (oscillating tilt)
            this._decoy.position.set(ox + 0.3, oy, 0);
            this._decoy.rotation.z = Math.sin(time * 6) * 0.12;
            setCloneOpacity(this._decoy, 0.8);
            // Scale bob for wave effect
            var waveBob = Math.sin(time * 6);
            this._decoy.scale.set(gs * (1 + waveBob * 0.03), gs * (1 - waveBob * 0.02), gs);

            // Sneaker creeps to the right, low and stealthy
            var sneakX = ox - 0.3 + t2 * 0.8;
            var sneakY = oy - 0.08 + Math.sin(time * 3) * 0.01;
            this._sneaker.position.set(sneakX, sneakY, 0);
            this._sneaker.rotation.z = -0.05; // slight crouch tilt
            setCloneOpacity(this._sneaker, 0.4); // semi-transparent = stealthy
            this._sneaker.scale.set(gs * 0.95, gs * 0.9, gs); // slightly crouched
        } else if (progress < 0.45) {
            // Phase 3: Sneaker plants prank box
            var t3 = (progress - 0.30) / 0.15;

            // Decoy keeps waving
            this._decoy.rotation.z = Math.sin(time * 6) * 0.12;
            var wb = Math.sin(time * 6);
            this._decoy.scale.set(gs * (1 + wb * 0.03), gs * (1 - wb * 0.02), gs);

            // Sneaker arrives at box location
            var plantX = ox + 0.5;
            this._sneaker.position.set(plantX, oy - 0.08, 0);

            // Prank box materializes
            this._prankBox.visible = true;
            this._prankBox.material.opacity = t3 * 0.8;
            this._prankBox.scale.setScalar(t3);

            // Fuse appears
            this._fuse.visible = true;
            this._fuse.position.set(plantX, oy - 0.15 + 0.04, 0);
            this._fuse.material.opacity = t3 * 0.9;

            // Sneaker backs away at end
            if (t3 > 0.7) {
                var backOff = (t3 - 0.7) / 0.3;
                this._sneaker.position.x = plantX - backOff * 0.3;
                setCloneOpacity(this._sneaker, 0.4 - backOff * 0.1);
            }
        } else if (progress < 0.60) {
            // Phase 4: Decoy sparkles distraction, fuse ticks
            var t4 = (progress - 0.45) / 0.15;

            // Decoy intensifies distracting
            this._decoy.rotation.z = Math.sin(time * 8) * 0.15;
            var wb2 = Math.sin(time * 8);
            this._decoy.scale.set(gs * (1 + wb2 * 0.04), gs * (1 - wb2 * 0.03), gs);

            // Sparkles from decoy
            if (time - this._lastSparkle > 0.08) {
                this._emitSparkle(this._decoy.position.x, this._decoy.position.y);
                this._lastSparkle = time;
            }

            // Sneaker hides behind decoy
            this._sneaker.position.set(ox + 0.3, oy, 0);
            setCloneOpacity(this._sneaker, 0.2);

            // Prank box ticks (scale pulse)
            var tick = Math.sin(time * 12);
            this._prankBox.scale.setScalar(1.0 + tick * 0.05);
            this._prankBox.material.opacity = 0.8;

            // Fuse blinks faster
            this._fuse.material.opacity = 0.5 + Math.sin(time * 15) * 0.5;
            this._fuse.position.set(this._prankBox.position.x, this._prankBox.position.y + 0.04, 0);
        } else if (progress < 0.75) {
            // Phase 5: Prank box EXPLODES with confetti!
            var t5 = (progress - 0.60) / 0.15;

            if (!this._exploded) {
                this._exploded = true;
                this._explodeConfetti(this._prankBox.position.x, this._prankBox.position.y);
            }

            // Box disappears
            this._prankBox.visible = false;
            this._fuse.visible = false;

            // Explosion flash
            if (t5 < 0.2) {
                this._explosionFlash.material.opacity = (1 - t5 / 0.2) * 0.7;
                this._explosionFlash.scale.setScalar(1 + t5 * 10);
            } else {
                this._explosionFlash.material.opacity = 0;
            }

            // Both clones react to explosion
            // Decoy jumps
            this._decoy.position.set(ox + 0.3, oy + Math.sin(t5 * Math.PI) * 0.15, 0);
            this._decoy.rotation.z = t5 * 0.3;
            setCloneOpacity(this._decoy, 0.8);

            // Sneaker peeks out
            this._sneaker.position.set(ox + 0.15, oy, 0);
            setCloneOpacity(this._sneaker, 0.3 + t5 * 0.3);

            // Stop sparkle generation
        } else if (progress < 0.90) {
            // Phase 6: Guilty merge back
            var t6 = (progress - 0.75) / 0.15;
            var easeIn = t6 * t6 * (3 - 2 * t6); // smoothstep

            this._explosionFlash.material.opacity = 0;

            // Both clones merge toward center
            this._decoy.position.set(
                ox + 0.3 * (1 - easeIn),
                oy,
                0
            );
            this._decoy.rotation.z = 0.3 * (1 - easeIn);
            setCloneOpacity(this._decoy, 0.8 * (1 - easeIn));

            this._sneaker.position.set(
                ox + 0.15 * (1 - easeIn),
                oy,
                0
            );
            setCloneOpacity(this._sneaker, 0.6 * (1 - easeIn));

            // Original model reappears
            model.visible = true;
            model.position.set(ox, oy, oz);
            model.scale.setScalar(gs);
            // Guilty tilt
            model.rotation.z = 0.06 * easeIn;

            if (easeIn > 0.8) {
                this._decoy.visible = false;
                this._sneaker.visible = false;
            }
        } else {
            // Phase 7: Settle with slight guilty tilt
            var t7 = (progress - 0.90) / 0.10;
            model.visible = true;
            model.position.copy(orig);
            model.scale.copy(this._origScale);
            // Slight guilty tilt that slowly straightens
            model.rotation.z = 0.06 * (1 - t7);

            this._decoy.visible = false;
            this._sneaker.visible = false;
            this._prankBox.visible = false;
            this._fuse.visible = false;
        }

        // Update sparkle particles
        for (var si = 0; si < this._sparkles.length; si++) {
            var sp = this._sparkles[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.vy -= 1.0 * delta;
            sp.angle += delta * 5;
            sp.mesh.rotation.z = sp.angle;
            sp.mesh.material.opacity = (sp.life / sp.maxLife) * 0.7;
            sp.mesh.scale.setScalar(0.5 + (sp.life / sp.maxLife) * 0.8);
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
            cp.vx += Math.sin(time * 5 + ci) * 0.3 * delta; // flutter
            cp.mesh.rotation.x += cp.rx * delta;
            cp.mesh.rotation.y += cp.ry * delta;
            cp.mesh.material.opacity = (cp.life / cp.maxLife) * 0.9;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._decoy) { scene.remove(this._decoy); disposeClone(this._decoy); }
        if (this._sneaker) { scene.remove(this._sneaker); disposeClone(this._sneaker); }
        if (this._prankBox) { scene.remove(this._prankBox); this._prankBox.geometry.dispose(); this._prankBox.material.dispose(); }
        if (this._fuse) { scene.remove(this._fuse); this._fuse.geometry.dispose(); this._fuse.material.dispose(); }
        if (this._explosionFlash) { scene.remove(this._explosionFlash); this._explosionFlash.geometry.dispose(); this._explosionFlash.material.dispose(); }
        if (this._sparkles) { this._sparkles.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._confetti) { this._confetti.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); }); }
        this._decoy = this._sneaker = this._prankBox = this._fuse = this._explosionFlash = this._sparkles = this._confetti = null;
    }
};
