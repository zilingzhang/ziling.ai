export default {
    name: 'Cogitating',
    label: 'cogitating',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // 5 interlocking gear tori rotating around head
        this._gears = [];
        var gearColors = [0xff8844, 0xddaa33, 0xcc7722, 0xffbb55, 0xee9933];
        var gearRadii = [0.12, 0.09, 0.14, 0.08, 0.11];
        var gearAngles = [0, Math.PI * 0.4, Math.PI * 0.8, Math.PI * 1.2, Math.PI * 1.6];
        var gearDists = [0.18, 0.22, 0.16, 0.25, 0.20];
        for (var i = 0; i < 5; i++) {
            var gearGeo = new THREE.TorusGeometry(gearRadii[i], 0.015, 6, 16);
            var gearMat = new THREE.MeshBasicMaterial({
                color: gearColors[i],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var gear = new THREE.Mesh(gearGeo, gearMat);
            gear.position.set(ox, oy + 0.15, 0);
            gear.visible = false;
            scene.add(gear);
            this._gears.push({
                mesh: gear,
                orbitAngle: gearAngles[i],
                orbitDist: gearDists[i],
                spinSpeed: (i % 2 === 0 ? 1 : -1) * (2.0 + i * 0.5),
                orbitSpeed: 0.6 + i * 0.15,
                radius: gearRadii[i]
            });
        }

        // Gear tooth markers (small cubes on each gear for visual teeth)
        this._teeth = [];
        var toothGeo = new THREE.BoxGeometry(0.018, 0.018, 0.018);
        for (var g = 0; g < 5; g++) {
            var teethPerGear = 6;
            for (var t = 0; t < teethPerGear; t++) {
                var tMat = new THREE.MeshBasicMaterial({
                    color: gearColors[g],
                    transparent: true, opacity: 0,
                    blending: THREE.AdditiveBlending, depthWrite: false
                });
                var tooth = new THREE.Mesh(toothGeo, tMat);
                tooth.visible = false;
                scene.add(tooth);
                this._teeth.push({
                    mesh: tooth,
                    gearIdx: g,
                    angle: (t / teethPerGear) * Math.PI * 2,
                    dist: gearRadii[g] + 0.02
                });
            }
        }

        // Steam whistle particles (puffs from ear areas)
        this._steamParticles = [];
        var steamGeo = new THREE.SphereGeometry(0.02, 5, 5);
        for (var s = 0; s < 20; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: s % 2 === 0 ? 0xffffff : 0xeeeecc,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var steam = new THREE.Mesh(steamGeo, sMat);
            steam.visible = false;
            scene.add(steam);
            this._steamParticles.push({
                mesh: steam,
                life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0,
                side: s % 2 === 0 ? -1 : 1
            });
        }
        this._steamIdx = 0;

        // Internal glow sphere
        var glowGeo = new THREE.SphereGeometry(0.3, 14, 14);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xff8833, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox, oy + 0.1, -0.05);
        scene.add(this._glow);

        this._lastSteamSpawn = 0;
    },
    _spawnSteam(ox, oy, side, intensity) {
        var p = this._steamParticles[this._steamIdx % this._steamParticles.length];
        this._steamIdx++;
        p.mesh.visible = true;
        p.side = side;
        p.mesh.position.set(ox + side * 0.15, oy + 0.12, 0.05);
        p.vx = side * (0.3 + Math.random() * 0.4) * intensity;
        p.vy = 0.4 + Math.random() * 0.6;
        p.vz = (Math.random() - 0.5) * 0.2;
        p.life = 0.5 + Math.random() * 0.6;
        p.maxLife = p.life;
        p.mesh.material.opacity = 0.6;
        p.mesh.scale.setScalar(0.5 + Math.random() * 0.5);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        var gearSpeedMult = 1.0;
        var steamIntensity = 0.5;

        if (progress < 0.08) {
            // Phase 1: First gears appear, slow rotation
            var t = progress / 0.08;
            gearSpeedMult = 0.3 + t * 0.3;
            this._glow.material.opacity = t * 0.03;

            for (var gi = 0; gi < 2; gi++) {
                this._gears[gi].mesh.visible = true;
                this._gears[gi].mesh.material.opacity = t * 0.6;
            }
            model.position.set(ox, oy + t * 0.005, oz);
        } else if (progress < 0.25) {
            // Phase 2: More gears engage, starting to mesh
            var t2 = (progress - 0.08) / 0.17;
            gearSpeedMult = 0.6 + t2 * 0.4;
            steamIntensity = 0.3 + t2 * 0.3;
            this._glow.material.opacity = 0.03 + t2 * 0.05;

            for (var gj = 0; gj < 5; gj++) {
                if (t2 > gj * 0.15) {
                    this._gears[gj].mesh.visible = true;
                    this._gears[gj].mesh.material.opacity = Math.min(0.7, (t2 - gj * 0.15) * 3);
                }
            }

            // Start steam
            if (t2 > 0.5 && time - this._lastSteamSpawn > 0.25) {
                this._spawnSteam(ox, oy, Math.random() > 0.5 ? 1 : -1, steamIntensity);
                this._lastSteamSpawn = time;
            }

            model.position.set(ox, oy + 0.005 + Math.sin(time * 1.5) * 0.003, oz);
        } else if (progress < 0.55) {
            // Phase 3: Full mechanical thought, gears interlocking
            var t3 = (progress - 0.25) / 0.30;
            gearSpeedMult = 1.0 + t3 * 0.5;
            steamIntensity = 0.6 + t3 * 0.4;
            this._glow.material.opacity = 0.08 + Math.sin(time * 2) * 0.03;

            for (var gk = 0; gk < 5; gk++) {
                this._gears[gk].mesh.visible = true;
                this._gears[gk].mesh.material.opacity = 0.7 + Math.sin(time * 3 + gk) * 0.1;
            }

            // Steam from both sides
            if (time - this._lastSteamSpawn > 0.15) {
                this._spawnSteam(ox, oy, -1, steamIntensity);
                this._spawnSteam(ox, oy, 1, steamIntensity);
                this._lastSteamSpawn = time;
            }

            model.position.set(ox, oy + 0.005 + Math.sin(time * 2) * 0.005, oz);
            model.rotation.z = Math.sin(time * 1.5) * 0.015;
        } else if (progress < 0.78) {
            // Phase 4: Thinking intensifies - gears speed up
            var t4 = (progress - 0.55) / 0.23;
            gearSpeedMult = 1.5 + t4 * 1.5;
            steamIntensity = 1.0 + t4 * 0.5;
            this._glow.material.opacity = 0.1 + t4 * 0.12;
            this._glow.material.color.setHex(0xffaa44);
            this._glow.scale.setScalar(1 + t4 * 0.3);

            for (var gl = 0; gl < 5; gl++) {
                this._gears[gl].mesh.material.opacity = 0.8 + Math.sin(time * 5 + gl) * 0.15;
            }

            // Rapid steam
            if (time - this._lastSteamSpawn > 0.08) {
                this._spawnSteam(ox, oy, -1, steamIntensity);
                this._spawnSteam(ox, oy, 1, steamIntensity);
                this._lastSteamSpawn = time;
            }

            model.position.set(ox + Math.sin(time * 8) * 0.003 * t4, oy + 0.008, oz);
            model.rotation.z = Math.sin(time * 2) * 0.02;
        } else if (progress < 0.90) {
            // Phase 5: Winding down
            var t5 = (progress - 0.78) / 0.12;
            gearSpeedMult = 3.0 * (1 - t5 * 0.7);
            steamIntensity = 1.5 * (1 - t5);
            this._glow.material.opacity = 0.22 * (1 - t5 * 0.6);
            this._glow.scale.setScalar(1.3 - t5 * 0.2);

            for (var gm = 0; gm < 5; gm++) {
                this._gears[gm].mesh.material.opacity = 0.8 * (1 - t5 * 0.5);
            }

            model.position.set(ox, oy + 0.008 * (1 - t5), oz);
            model.rotation.z = Math.sin(time * 1.5) * 0.015 * (1 - t5);
        } else {
            // Phase 6: Rest
            var t6 = (progress - 0.90) / 0.10;
            gearSpeedMult = 0.9 * (1 - t6);
            this._glow.material.opacity = 0.09 * (1 - t6);

            for (var gn = 0; gn < 5; gn++) {
                this._gears[gn].mesh.material.opacity = 0.4 * (1 - t6);
            }

            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update gear positions and rotations
        for (var gu = 0; gu < 5; gu++) {
            var gear = this._gears[gu];
            if (!gear.mesh.visible) continue;
            gear.orbitAngle += gear.orbitSpeed * delta * gearSpeedMult * 0.3;
            var gx = ox + Math.cos(gear.orbitAngle) * gear.orbitDist;
            var gy = oy + 0.15 + Math.sin(gear.orbitAngle) * gear.orbitDist * 0.6;
            gear.mesh.position.set(gx, gy, 0.02);
            gear.mesh.rotation.z += gear.spinSpeed * delta * gearSpeedMult;
            gear.mesh.rotation.x = Math.PI * 0.3 + Math.sin(time + gu) * 0.2;

            // Update teeth for this gear
            for (var ti = 0; ti < this._teeth.length; ti++) {
                var tooth = this._teeth[ti];
                if (tooth.gearIdx !== gu) continue;
                tooth.mesh.visible = gear.mesh.visible;
                var ta = tooth.angle + gear.mesh.rotation.z;
                tooth.mesh.position.set(
                    gx + Math.cos(ta) * tooth.dist,
                    gy + Math.sin(ta) * tooth.dist * 0.6,
                    0.03
                );
                tooth.mesh.material.opacity = gear.mesh.material.opacity * 0.8;
                tooth.mesh.rotation.z = ta;
            }
        }

        // Update steam particles
        for (var si = 0; si < this._steamParticles.length; si++) {
            var sp = this._steamParticles[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.mesh.position.z += sp.vz * delta;
            sp.vy += 0.3 * delta;
            var lr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = lr * 0.5;
            sp.mesh.scale.setScalar(0.5 + (1 - lr) * 1.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._gears) {
            this._gears.forEach(function(g) {
                scene.remove(g.mesh); g.mesh.geometry.dispose(); g.mesh.material.dispose();
            });
        }
        if (this._teeth) {
            this._teeth.forEach(function(t) {
                scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose();
            });
        }
        if (this._steamParticles) {
            this._steamParticles.forEach(function(s) {
                scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose();
            });
        }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        this._gears = this._teeth = this._steamParticles = this._glow = null;
    }
};
