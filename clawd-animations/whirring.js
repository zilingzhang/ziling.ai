export default {
    name: 'Whirring',
    label: 'whirring',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Gear tori (different sizes)
        this._gears = [];
        var gearConfigs = [
            { x: ox - 0.25, y: oy + 0.05, r: 0.1, tube: 0.02, color: 0x888899, speed: 1.0 },
            { x: ox + 0.15, y: oy + 0.12, r: 0.07, tube: 0.015, color: 0xaa8866, speed: -1.4 },
            { x: ox - 0.05, y: oy - 0.12, r: 0.12, tube: 0.018, color: 0x999988, speed: 0.8 },
            { x: ox + 0.3, y: oy - 0.05, r: 0.06, tube: 0.012, color: 0xbb9977, speed: -1.8 },
            { x: ox - 0.35, y: oy - 0.1, r: 0.08, tube: 0.015, color: 0x887788, speed: 1.2 }
        ];
        for (var i = 0; i < gearConfigs.length; i++) {
            var gc = gearConfigs[i];
            var gGeo = new THREE.TorusGeometry(gc.r, gc.tube, 8, 24);
            var gMat = new THREE.MeshBasicMaterial({
                color: gc.color, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var gear = new THREE.Mesh(gGeo, gMat);
            gear.position.set(gc.x, gc.y, 0);
            scene.add(gear);
            this._gears.push({
                mesh: gear, speed: gc.speed,
                baseX: gc.x, baseY: gc.y,
                currentSpeed: 0
            });
        }

        // Ring afterimages (blur trail)
        this._afterimages = [];
        for (var j = 0; j < gearConfigs.length; j++) {
            var aiRings = [];
            for (var a = 0; a < 3; a++) {
                var aiGeo = new THREE.TorusGeometry(gearConfigs[j].r, gearConfigs[j].tube * 0.6, 6, 16);
                var aiMat = new THREE.MeshBasicMaterial({
                    color: gearConfigs[j].color, transparent: true, opacity: 0,
                    blending: THREE.AdditiveBlending, depthWrite: false
                });
                var aiMesh = new THREE.Mesh(aiGeo, aiMat);
                aiMesh.position.set(gearConfigs[j].x, gearConfigs[j].y, -0.01 - a * 0.01);
                aiMesh.visible = false;
                scene.add(aiMesh);
                aiRings.push(aiMesh);
            }
            this._afterimages.push(aiRings);
        }

        // Vibration particles
        this._vibParts = [];
        var vibGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var k = 0; k < 20; k++) {
            var vColors = [0xaabbcc, 0x889999, 0xbbccdd, 0x99aabb];
            var vMat = new THREE.MeshBasicMaterial({
                color: vColors[k % vColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var vib = new THREE.Mesh(vibGeo, vMat);
            vib.visible = false;
            scene.add(vib);
            this._vibParts.push({ mesh: vib, life: 0, maxLife: 0, vx: 0, vy: 0 });
        }
        this._vibIdx = 0;

        // Concentric hum torus pulses
        this._humRings = [];
        for (var m = 0; m < 4; m++) {
            var hGeo = new THREE.TorusGeometry(0.15 + m * 0.08, 0.005, 6, 32);
            var hMat = new THREE.MeshBasicMaterial({
                color: m % 2 === 0 ? 0x889999 : 0xaa8877, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var hum = new THREE.Mesh(hGeo, hMat);
            hum.position.set(ox, oy, -0.03);
            scene.add(hum);
            this._humRings.push({ mesh: hum, phase: m * 0.8 });
        }

        // Hot glow at peak
        var hotGeo = new THREE.SphereGeometry(0.2, 10, 10);
        var hotMat = new THREE.MeshBasicMaterial({
            color: 0xcc6644, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._hotGlow = new THREE.Mesh(hotGeo, hotMat);
        this._hotGlow.position.set(ox, oy, -0.02);
        scene.add(this._hotGlow);

        this._lastVib = 0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.08) {
            // Phase 1: Gears appear
            var t = progress / 0.08;
            for (var gi = 0; gi < this._gears.length; gi++) {
                this._gears[gi].mesh.material.opacity = t * 0.5;
            }
            model.position.set(ox + 0.35, oy, oz);
        } else if (progress < 0.40) {
            // Phase 2: Gears start spinning, speed increases
            var t2 = (progress - 0.08) / 0.32;
            var speedMult = t2 * t2 * 3.0; // Accelerating

            for (var gj = 0; gj < this._gears.length; gj++) {
                var gear = this._gears[gj];
                gear.currentSpeed = gear.speed * speedMult;
                gear.mesh.rotation.z += gear.currentSpeed * delta;
                // Slight wobble as speed increases
                gear.mesh.rotation.x = Math.sin(time * 2 + gj) * 0.1 * t2;
                gear.mesh.material.opacity = 0.5 + t2 * 0.2;
            }

            model.position.set(ox + 0.35, oy + Math.sin(time * 2) * 0.01, oz);
        } else if (progress < 0.65) {
            // Phase 3: High speed with blur trails
            var t3 = (progress - 0.40) / 0.25;
            var speedMult2 = 3.0 + t3 * 4.0;

            for (var gk = 0; gk < this._gears.length; gk++) {
                var gear2 = this._gears[gk];
                gear2.currentSpeed = gear2.speed * speedMult2;
                gear2.mesh.rotation.z += gear2.currentSpeed * delta;
                gear2.mesh.material.opacity = 0.7;

                // Afterimage blur trails
                var aiRings = this._afterimages[gk];
                for (var ai = 0; ai < aiRings.length; ai++) {
                    aiRings[ai].visible = true;
                    aiRings[ai].rotation.z = gear2.mesh.rotation.z - (ai + 1) * gear2.currentSpeed * 0.02;
                    aiRings[ai].material.opacity = 0.15 * (1 - ai * 0.3);
                    aiRings[ai].position.copy(gear2.mesh.position);
                }
            }

            // Vibration particles
            if (time - this._lastVib > 0.1) {
                var randGear = this._gears[Math.floor(Math.random() * this._gears.length)];
                var v = this._vibParts[this._vibIdx % this._vibParts.length];
                this._vibIdx++;
                v.mesh.visible = true;
                v.mesh.position.set(randGear.baseX, randGear.baseY, 0);
                v.vx = (Math.random() - 0.5) * 1.5;
                v.vy = (Math.random() - 0.5) * 1.5;
                v.life = 0.3 + Math.random() * 0.2;
                v.maxLife = v.life;
                v.mesh.material.opacity = 0.5;
                this._lastVib = time;
            }

            // Hum ring pulses
            for (var hi = 0; hi < this._humRings.length; hi++) {
                var hr = this._humRings[hi];
                var pulse = Math.sin(time * 4 + hr.phase);
                hr.mesh.material.opacity = 0.1 + pulse * 0.08;
                hr.mesh.scale.setScalar(1 + pulse * 0.05);
            }

            model.position.set(ox + 0.35, oy + Math.sin(time * 6) * 0.005, oz);
        } else if (progress < 0.82) {
            // Phase 4: Peak RPM with hot glow
            var t4 = (progress - 0.65) / 0.17;
            var peakSpeed = 7.0;

            for (var gl = 0; gl < this._gears.length; gl++) {
                var gear3 = this._gears[gl];
                gear3.currentSpeed = gear3.speed * peakSpeed;
                gear3.mesh.rotation.z += gear3.currentSpeed * delta;
                gear3.mesh.material.opacity = 0.7;

                // Color shifts to hot
                var hotT = Math.sin(time * 3 + gl) * 0.5 + 0.5;
                var r = 0.53 + hotT * 0.27;
                var g = 0.4 + hotT * 0.1;
                var b = 0.35 - hotT * 0.1;
                gear3.mesh.material.color.setRGB(r, g, b);

                var aiR2 = this._afterimages[gl];
                for (var aj = 0; aj < aiR2.length; aj++) {
                    aiR2[aj].visible = true;
                    aiR2[aj].rotation.z = gear3.mesh.rotation.z - (aj + 1) * gear3.currentSpeed * 0.015;
                    aiR2[aj].material.opacity = 0.2 * (1 - aj * 0.3);
                    aiR2[aj].position.copy(gear3.mesh.position);
                }
            }

            // Hot glow
            this._hotGlow.material.opacity = 0.15 + Math.sin(time * 5) * 0.05;
            this._hotGlow.scale.setScalar(1 + Math.sin(time * 3) * 0.1);

            // Hum intensifies
            for (var hj = 0; hj < this._humRings.length; hj++) {
                var hr2 = this._humRings[hj];
                hr2.mesh.material.opacity = 0.15 + Math.sin(time * 5 + hr2.phase) * 0.1;
            }

            model.position.set(ox + 0.35, oy + Math.sin(time * 8) * 0.003, oz);
        } else {
            // Phase 5: Wind down and fade
            var t5 = (progress - 0.82) / 0.18;

            for (var gm = 0; gm < this._gears.length; gm++) {
                var gear4 = this._gears[gm];
                var windDown = 7.0 * (1 - t5 * t5);
                gear4.currentSpeed = gear4.speed * windDown;
                gear4.mesh.rotation.z += gear4.currentSpeed * delta;
                gear4.mesh.material.opacity = 0.7 * (1 - t5);

                // Reset color
                gear4.mesh.material.color.setHex(0x888899);

                var aiR3 = this._afterimages[gm];
                for (var ak = 0; ak < aiR3.length; ak++) {
                    aiR3[ak].material.opacity = 0.15 * (1 - t5);
                }
            }

            this._hotGlow.material.opacity = 0.15 * (1 - t5);
            for (var hk = 0; hk < this._humRings.length; hk++) {
                this._humRings[hk].mesh.material.opacity = 0.15 * (1 - t5);
            }

            model.position.set(ox + 0.35 * (1 - t5), oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update vibration particles
        for (var vi = 0; vi < this._vibParts.length; vi++) {
            var vp = this._vibParts[vi];
            if (vp.life <= 0) continue;
            vp.life -= delta;
            if (vp.life <= 0) { vp.mesh.visible = false; continue; }
            vp.mesh.position.x += vp.vx * delta;
            vp.mesh.position.y += vp.vy * delta;
            vp.mesh.material.opacity = 0.5 * (vp.life / vp.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._gears) {
            this._gears.forEach(function(g) { scene.remove(g.mesh); g.mesh.geometry.dispose(); g.mesh.material.dispose(); });
        }
        if (this._afterimages) {
            this._afterimages.forEach(function(arr) {
                arr.forEach(function(a) { scene.remove(a); a.geometry.dispose(); a.material.dispose(); });
            });
        }
        if (this._vibParts) {
            this._vibParts.forEach(function(v) { scene.remove(v.mesh); v.mesh.geometry.dispose(); v.mesh.material.dispose(); });
        }
        if (this._humRings) {
            this._humRings.forEach(function(h) { scene.remove(h.mesh); h.mesh.geometry.dispose(); h.mesh.material.dispose(); });
        }
        if (this._hotGlow) { scene.remove(this._hotGlow); this._hotGlow.geometry.dispose(); this._hotGlow.material.dispose(); }
        this._gears = this._afterimages = this._vibParts = this._humRings = this._hotGlow = null;
    }
};
