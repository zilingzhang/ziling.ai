export default {
    name: 'Blanching',
    label: 'blanching',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Hot pot (cylinder)
        var potGeo = new THREE.CylinderGeometry(0.22, 0.2, 0.25, 16);
        var potMat = new THREE.MeshBasicMaterial({
            color: 0x888888, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._pot = new THREE.Mesh(potGeo, potMat);
        this._pot.position.set(ox - 0.35, oy - 0.2, 0);
        scene.add(this._pot);

        // Hot water surface
        var waterGeo = new THREE.CircleGeometry(0.2, 20);
        var waterMat = new THREE.MeshBasicMaterial({
            color: 0xff4422, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._hotWater = new THREE.Mesh(waterGeo, waterMat);
        this._hotWater.position.set(ox - 0.35, oy - 0.08, 0);
        scene.add(this._hotWater);

        // Ice bath (blue cylinder)
        var iceGeo = new THREE.CylinderGeometry(0.2, 0.18, 0.2, 16);
        var iceMat = new THREE.MeshBasicMaterial({
            color: 0x4488cc, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._iceBath = new THREE.Mesh(iceGeo, iceMat);
        this._iceBath.position.set(ox + 0.35, oy - 0.22, 0);
        scene.add(this._iceBath);

        // Ice water surface
        var iceWaterGeo = new THREE.CircleGeometry(0.18, 20);
        var iceWaterMat = new THREE.MeshBasicMaterial({
            color: 0x88ccff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._iceWater = new THREE.Mesh(iceWaterGeo, iceWaterMat);
        this._iceWater.position.set(ox + 0.35, oy - 0.12, 0);
        scene.add(this._iceWater);

        // Food sphere
        var foodGeo = new THREE.SphereGeometry(0.06, 10, 10);
        var foodMat = new THREE.MeshBasicMaterial({
            color: 0x44aa44, transparent: true, opacity: 0
        });
        this._food = new THREE.Mesh(foodGeo, foodMat);
        this._food.position.set(ox - 0.35, oy + 0.1, 0);
        scene.add(this._food);

        // Boiling bubbles
        this._bubbles = [];
        var bubGeo = new THREE.SphereGeometry(0.015, 6, 6);
        for (var i = 0; i < 30; i++) {
            var bMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bub = new THREE.Mesh(bubGeo, bMat);
            bub.visible = false;
            scene.add(bub);
            this._bubbles.push({
                mesh: bub, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._bubIdx = 0;

        // Steam particles
        this._steam = [];
        var steamGeo = new THREE.SphereGeometry(0.03, 6, 6);
        for (var j = 0; j < 20; j++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0xddddff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var stm = new THREE.Mesh(steamGeo, sMat);
            stm.visible = false;
            scene.add(stm);
            this._steam.push({
                mesh: stm, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._steamIdx = 0;

        // Temperature shock particles (red->blue transition)
        this._shockParticles = [];
        var shockGeo = new THREE.SphereGeometry(0.012, 5, 5);
        for (var k = 0; k < 25; k++) {
            var skMat = new THREE.MeshBasicMaterial({
                color: 0xff4400, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sk = new THREE.Mesh(shockGeo, skMat);
            sk.visible = false;
            scene.add(sk);
            this._shockParticles.push({
                mesh: sk, life: 0, maxLife: 0,
                vx: 0, vy: 0, isHot: true
            });
        }
        this._shockIdx = 0;

        // Heat glow under pot
        var heatGeo = new THREE.CircleGeometry(0.18, 16);
        var heatMat = new THREE.MeshBasicMaterial({
            color: 0xff6600, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._heatGlow = new THREE.Mesh(heatGeo, heatMat);
        this._heatGlow.position.set(ox - 0.35, oy - 0.33, 0);
        scene.add(this._heatGlow);

        // Ice cubes (small boxes in ice bath)
        this._iceCubes = [];
        var cubeGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        for (var c = 0; c < 5; c++) {
            var cMat = new THREE.MeshBasicMaterial({
                color: 0xaaddff, transparent: true, opacity: 0
            });
            var cube = new THREE.Mesh(cubeGeo, cMat);
            var cAngle = (c / 5) * Math.PI * 2;
            cube.position.set(
                ox + 0.35 + Math.cos(cAngle) * 0.1,
                oy - 0.12,
                Math.sin(cAngle) * 0.05
            );
            cube.rotation.set(Math.random() * 0.5, Math.random() * 0.5, Math.random() * 0.5);
            scene.add(cube);
            this._iceCubes.push(cube);
        }
    },
    _spawnBubble(x, y, speed) {
        var b = this._bubbles[this._bubIdx % this._bubbles.length];
        this._bubIdx++;
        b.mesh.visible = true;
        b.mesh.position.set(x + (Math.random() - 0.5) * 0.3, y, (Math.random() - 0.5) * 0.08);
        b.vx = (Math.random() - 0.5) * 0.1;
        b.vy = speed + Math.random() * 0.3;
        b.life = 0.3 + Math.random() * 0.4;
        b.maxLife = b.life;
        b.mesh.material.opacity = 0.6;
    },
    _spawnSteam(x, y) {
        var s = this._steam[this._steamIdx % this._steam.length];
        this._steamIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x + (Math.random() - 0.5) * 0.15, y, 0);
        s.vx = (Math.random() - 0.5) * 0.2;
        s.vy = 0.5 + Math.random() * 0.4;
        s.life = 0.6 + Math.random() * 0.5;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.4;
    },
    _spawnShock(x, y, isHot) {
        var p = this._shockParticles[this._shockIdx % this._shockParticles.length];
        this._shockIdx++;
        p.mesh.visible = true;
        p.mesh.position.set(x + (Math.random() - 0.5) * 0.15, y, (Math.random() - 0.5) * 0.1);
        p.vx = (Math.random() - 0.5) * 0.6;
        p.vy = (Math.random() - 0.5) * 0.6;
        p.life = 0.4 + Math.random() * 0.3;
        p.maxLife = p.life;
        p.isHot = isHot;
        p.mesh.material.color.setHex(isHot ? 0xff4400 : 0x4488ff);
        p.mesh.material.opacity = 0.7;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var potX = ox - 0.35;
        var potY = oy - 0.08;
        var iceX = ox + 0.35;
        var iceY = oy - 0.12;

        if (progress < 0.10) {
            // Phase 1: Pot and ice bath appear
            var t = progress / 0.10;
            var ease = t * t;
            this._pot.material.opacity = ease * 0.7;
            this._hotWater.material.opacity = ease * 0.5;
            this._iceBath.material.opacity = ease * 0.6;
            this._iceWater.material.opacity = ease * 0.4;
            this._heatGlow.material.opacity = ease * 0.3;
            for (var ci = 0; ci < this._iceCubes.length; ci++) {
                this._iceCubes[ci].material.opacity = ease * 0.5;
            }
            this._food.material.opacity = ease * 0.8;
            model.position.set(ox, oy + 0.05, oz);
        } else if (progress < 0.20) {
            // Phase 2: Water starts boiling, food above pot
            var t2 = (progress - 0.10) / 0.10;
            this._pot.material.opacity = 0.7;
            this._hotWater.material.opacity = 0.5 + t2 * 0.2;
            this._heatGlow.material.opacity = 0.3 + t2 * 0.2 + Math.sin(time * 6) * 0.1;

            // Boiling bubbles
            if (Math.random() < 0.15 + t2 * 0.15) {
                this._spawnBubble(potX, potY, 0.3 + t2 * 0.3);
            }

            this._food.position.set(potX, oy + 0.1, 0);
            model.position.set(ox, oy + 0.05, oz);
        } else if (progress < 0.40) {
            // Phase 3: Food dunks into hot water, steam erupts
            var t3 = (progress - 0.20) / 0.20;
            var dunkY = oy + 0.1 - t3 * 0.22;
            this._food.position.set(potX, Math.max(dunkY, potY - 0.05), 0);

            // Hot water reaction
            this._hotWater.material.opacity = 0.7 + Math.sin(time * 8) * 0.1;
            this._hotWater.scale.setScalar(1 + Math.sin(time * 6) * 0.05);

            // Vigorous boiling
            if (Math.random() < 0.25) {
                this._spawnBubble(potX, potY, 0.5 + t3 * 0.3);
            }

            // Steam eruption on contact
            if (t3 > 0.3 && Math.random() < 0.15 + t3 * 0.1) {
                this._spawnSteam(potX, potY + 0.05);
            }

            // Hot shock particles
            if (t3 > 0.4 && Math.random() < 0.1) {
                this._spawnShock(potX, potY, true);
            }

            // Food color changes (cooking)
            var cookProgress = Math.max(0, (t3 - 0.3) / 0.7);
            this._food.material.color.setRGB(
                0.27 + cookProgress * 0.2,
                0.67 - cookProgress * 0.1,
                0.27 - cookProgress * 0.05
            );

            // Model dunks food
            model.position.set(ox, oy + 0.05 - t3 * 0.03, oz);
            model.rotation.z = -t3 * 0.05;

            this._heatGlow.material.opacity = 0.5 + Math.sin(time * 6) * 0.15;
        } else if (progress < 0.55) {
            // Phase 4: Quick transfer - food lifts from hot water
            var t4 = (progress - 0.40) / 0.15;

            // Food lifts up and arcs toward ice bath
            var arcT = t4;
            var foodX = potX + (iceX - potX) * arcT;
            var foodY = (potY - 0.05) + Math.sin(arcT * Math.PI) * 0.25;
            this._food.position.set(foodX, foodY, 0);

            // Trail of hot particles during transfer
            if (Math.random() < 0.2) {
                this._spawnShock(foodX, foodY, true);
            }

            // Steam from hot food in air
            if (Math.random() < 0.1) {
                this._spawnSteam(foodX, foodY);
            }

            // Boiling continues on pot
            if (Math.random() < 0.1) {
                this._spawnBubble(potX, potY, 0.4);
            }

            // Model follows transfer
            model.position.set(ox + t4 * 0.15, oy + 0.05, oz);
            model.rotation.z = 0;
        } else if (progress < 0.75) {
            // Phase 5: Food plunges into ice bath - temperature shock!
            var t5 = (progress - 0.55) / 0.20;
            var plungeY = oy + 0.1 - t5 * 0.25;
            this._food.position.set(iceX, Math.max(plungeY, iceY - 0.03), 0);

            // Ice water reaction
            this._iceWater.material.opacity = 0.4 + t5 * 0.3 + Math.sin(time * 5) * 0.08;

            // Temperature shock particles (blue/cold)
            if (t5 > 0.2 && Math.random() < 0.2 + t5 * 0.1) {
                this._spawnShock(iceX, iceY, false);
            }

            // Mixed hot-cold particles at impact
            if (t5 > 0.2 && t5 < 0.6 && Math.random() < 0.1) {
                this._spawnShock(iceX, iceY, true);
            }

            // Food color shifts to bright green (blanched)
            var blanchProgress = Math.max(0, (t5 - 0.2) / 0.8);
            this._food.material.color.setRGB(
                0.2 + blanchProgress * 0.1,
                0.57 + blanchProgress * 0.3,
                0.22 + blanchProgress * 0.15
            );

            // Ice cubes bob
            for (var ici = 0; ici < this._iceCubes.length; ici++) {
                this._iceCubes[ici].position.y = oy - 0.12 + Math.sin(time * 3 + ici * 1.5) * 0.015;
                this._iceCubes[ici].rotation.y += delta * 0.5;
            }

            // Pot still simmering
            if (Math.random() < 0.05) {
                this._spawnBubble(potX, potY, 0.2);
            }

            model.position.set(ox + 0.15, oy + 0.05, oz);
        } else if (progress < 0.88) {
            // Phase 6: Food rests in ice bath, cooling
            var t6 = (progress - 0.75) / 0.13;
            this._food.position.set(iceX, iceY - 0.03, 0);

            // Gentle cold particles
            if (Math.random() < 0.06) {
                this._spawnShock(iceX, iceY, false);
            }

            // Food reaches perfect blanched color
            this._food.material.color.setRGB(0.3, 0.87, 0.37);

            // Ice cubes continue bobbing
            for (var ici2 = 0; ici2 < this._iceCubes.length; ici2++) {
                this._iceCubes[ici2].position.y = oy - 0.12 + Math.sin(time * 2 + ici2 * 1.5) * 0.01;
            }

            // Pot calming
            this._heatGlow.material.opacity = (0.5 - t6 * 0.3) + Math.sin(time * 4) * 0.05;

            model.position.set(ox + 0.15, oy + 0.05, oz);
            model.rotation.z = Math.sin(time * 1.5) * 0.02;
        } else {
            // Phase 7: Fade out
            var t7 = (progress - 0.88) / 0.12;
            this._pot.material.opacity = 0.7 * (1 - t7);
            this._hotWater.material.opacity = 0.7 * (1 - t7);
            this._iceBath.material.opacity = 0.6 * (1 - t7);
            this._iceWater.material.opacity = 0.7 * (1 - t7);
            this._food.material.opacity = 0.8 * (1 - t7);
            this._heatGlow.material.opacity = 0.2 * (1 - t7);
            for (var fi = 0; fi < this._iceCubes.length; fi++) {
                this._iceCubes[fi].material.opacity = 0.5 * (1 - t7);
            }

            model.position.set(ox + 0.15 * (1 - t7), oy + 0.05 * (1 - t7), oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update bubbles
        for (var bi = 0; bi < this._bubbles.length; bi++) {
            var bb = this._bubbles[bi];
            if (bb.life <= 0) continue;
            bb.life -= delta;
            if (bb.life <= 0) { bb.mesh.visible = false; continue; }
            bb.mesh.position.x += bb.vx * delta;
            bb.mesh.position.y += bb.vy * delta;
            bb.mesh.position.x += Math.sin(time * 10 + bi) * 0.001;
            var lr = bb.life / bb.maxLife;
            bb.mesh.material.opacity = lr * 0.6;
            bb.mesh.scale.setScalar(0.5 + (1 - lr) * 0.5);
        }

        // Update steam
        for (var si = 0; si < this._steam.length; si++) {
            var sp = this._steam[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.mesh.position.x += Math.sin(time * 4 + si * 2) * 0.002;
            var slr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = slr * 0.35;
            sp.mesh.scale.setScalar(0.6 + (1 - slr) * 1.5);
        }

        // Update shock particles
        for (var ki = 0; ki < this._shockParticles.length; ki++) {
            var sk = this._shockParticles[ki];
            if (sk.life <= 0) continue;
            sk.life -= delta;
            if (sk.life <= 0) { sk.mesh.visible = false; continue; }
            sk.mesh.position.x += sk.vx * delta;
            sk.mesh.position.y += sk.vy * delta;
            var skr = sk.life / sk.maxLife;
            sk.mesh.material.opacity = skr * 0.7;
            sk.mesh.scale.setScalar(0.5 + (1 - skr) * 0.8);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._pot) { scene.remove(this._pot); this._pot.geometry.dispose(); this._pot.material.dispose(); }
        if (this._hotWater) { scene.remove(this._hotWater); this._hotWater.geometry.dispose(); this._hotWater.material.dispose(); }
        if (this._iceBath) { scene.remove(this._iceBath); this._iceBath.geometry.dispose(); this._iceBath.material.dispose(); }
        if (this._iceWater) { scene.remove(this._iceWater); this._iceWater.geometry.dispose(); this._iceWater.material.dispose(); }
        if (this._food) { scene.remove(this._food); this._food.geometry.dispose(); this._food.material.dispose(); }
        if (this._heatGlow) { scene.remove(this._heatGlow); this._heatGlow.geometry.dispose(); this._heatGlow.material.dispose(); }
        if (this._bubbles) { this._bubbles.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); }); }
        if (this._steam) { this._steam.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._shockParticles) { this._shockParticles.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        if (this._iceCubes) { this._iceCubes.forEach(function(c) { scene.remove(c); c.geometry.dispose(); c.material.dispose(); }); }
        this._pot = this._hotWater = this._iceBath = this._iceWater = this._food = this._heatGlow = null;
        this._bubbles = this._steam = this._shockParticles = this._iceCubes = null;
    }
};
