export default {
    name: 'Spelunking',
    label: 'spelunking',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Cave background (dark plane)
        var caveGeo = new THREE.PlaneGeometry(1.8, 1.0);
        var caveMat = new THREE.MeshBasicMaterial({
            color: 0x111118, transparent: true, opacity: 0,
            depthWrite: false, side: THREE.DoubleSide
        });
        this._caveBg = new THREE.Mesh(caveGeo, caveMat);
        this._caveBg.position.set(ox, oy, -0.1);
        scene.add(this._caveBg);

        // Headlamp beam (cone shape)
        var beamGeo = new THREE.ConeGeometry(0.25, 0.6, 8, 1, true);
        var beamMat = new THREE.MeshBasicMaterial({
            color: 0xffffcc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this._beam = new THREE.Mesh(beamGeo, beamMat);
        this._beam.position.set(ox, oy + 0.1, 0.05);
        this._beam.rotation.z = -Math.PI / 2;
        scene.add(this._beam);

        // Stalactites (inverted cones hanging from top)
        this._stalactites = [];
        var stalPositions = [
            { x: ox - 0.5, len: 0.2 }, { x: ox - 0.2, len: 0.3 },
            { x: ox + 0.1, len: 0.15 }, { x: ox + 0.35, len: 0.25 },
            { x: ox + 0.6, len: 0.18 }, { x: ox - 0.65, len: 0.22 },
            { x: ox + 0.5, len: 0.12 }
        ];
        for (var i = 0; i < stalPositions.length; i++) {
            var sGeo = new THREE.ConeGeometry(0.03, stalPositions[i].len, 6);
            var sMat = new THREE.MeshBasicMaterial({
                color: 0x445566, transparent: true, opacity: 0,
                depthWrite: false
            });
            var stal = new THREE.Mesh(sGeo, sMat);
            stal.position.set(stalPositions[i].x, oy + 0.4, 0);
            stal.rotation.z = Math.PI; // Inverted
            scene.add(stal);
            this._stalactites.push(stal);
        }

        // Stalagmites (cones from bottom)
        this._stalagmites = [];
        var stagPositions = [
            { x: ox - 0.4, len: 0.15 }, { x: ox + 0.0, len: 0.1 },
            { x: ox + 0.25, len: 0.2 }, { x: ox + 0.55, len: 0.12 },
            { x: ox - 0.6, len: 0.18 }
        ];
        for (var j = 0; j < stagPositions.length; j++) {
            var sgGeo = new THREE.ConeGeometry(0.025, stagPositions[j].len, 6);
            var sgMat = new THREE.MeshBasicMaterial({
                color: 0x556677, transparent: true, opacity: 0,
                depthWrite: false
            });
            var stag = new THREE.Mesh(sgGeo, sgMat);
            stag.position.set(stagPositions[j].x, oy - 0.35 + stagPositions[j].len * 0.5, 0);
            scene.add(stag);
            this._stalagmites.push(stag);
        }

        // Crystal discoveries (glowing colored spheres)
        this._crystals = [];
        var crystalGeo = new THREE.OctahedronGeometry(0.04, 0);
        var crystalColors = [0x44ffdd, 0xff44aa, 0xaaff44, 0x44aaff, 0xffaa44];
        var crystalPos = [
            { x: ox - 0.3, y: oy - 0.15 },
            { x: ox + 0.2, y: oy + 0.05 },
            { x: ox + 0.5, y: oy - 0.2 },
            { x: ox - 0.55, y: oy + 0.1 },
            { x: ox + 0.4, y: oy + 0.15 }
        ];
        for (var k = 0; k < 5; k++) {
            var crMat = new THREE.MeshBasicMaterial({
                color: crystalColors[k], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var crystal = new THREE.Mesh(crystalGeo, crMat);
            crystal.position.set(crystalPos[k].x, crystalPos[k].y, 0.02);
            crystal.visible = false;
            scene.add(crystal);
            this._crystals.push({ mesh: crystal, discovered: false, glow: 0 });
        }

        // Water drip particles
        this._drips = [];
        var dripGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var m = 0; m < 15; m++) {
            var drMat = new THREE.MeshBasicMaterial({
                color: 0x6699cc, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var drip = new THREE.Mesh(dripGeo, drMat);
            drip.visible = false;
            scene.add(drip);
            this._drips.push({ mesh: drip, life: 0, maxLife: 0, vy: 0, startX: 0 });
        }
        this._dripIdx = 0;

        // Crystal glow aura
        var auraGeo = new THREE.SphereGeometry(0.08, 8, 8);
        var auraMat = new THREE.MeshBasicMaterial({
            color: 0x44ffdd, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._crystalAura = new THREE.Mesh(auraGeo, auraMat);
        this._crystalAura.visible = false;
        scene.add(this._crystalAura);

        this._lastDrip = 0;
        this._modelPath = 0;
    },
    _emitDrip(x, y) {
        var d = this._drips[this._dripIdx % this._drips.length];
        this._dripIdx++;
        d.mesh.visible = true;
        d.startX = x;
        d.mesh.position.set(x, y, 0);
        d.vy = 0;
        d.life = 1.0 + Math.random() * 0.5;
        d.maxLife = d.life;
        d.mesh.material.opacity = 0.6;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;

        if (progress < 0.06) {
            // Phase 1: Cave appears, darkness descends
            var t = progress / 0.06;
            this._caveBg.material.opacity = t * 0.6;
            for (var si = 0; si < this._stalactites.length; si++) {
                this._stalactites[si].material.opacity = t * 0.5;
            }
            for (var sgi = 0; sgi < this._stalagmites.length; sgi++) {
                this._stalagmites[sgi].material.opacity = t * 0.5;
            }
            model.position.set(ox - 0.7, oy, orig.z);
        } else if (progress < 0.15) {
            // Phase 2: Headlamp turns on
            var t2 = (progress - 0.06) / 0.09;
            this._beam.material.opacity = t2 * 0.2;
            model.position.set(ox - 0.7 + t2 * 0.1, oy, orig.z);
        } else if (progress < 0.75) {
            // Phase 3: Navigate through cave
            var t3 = (progress - 0.15) / 0.60;

            // Sinuous path through obstacles
            this._modelPath = t3;
            var pathX = ox - 0.6 + t3 * 1.2;
            var pathY = oy + Math.sin(t3 * Math.PI * 3) * 0.12;

            model.position.set(pathX, pathY, orig.z);
            model.rotation.z = Math.sin(t3 * Math.PI * 3) * 0.06;

            // Headlamp follows model
            this._beam.position.set(pathX + 0.15, pathY + 0.1, 0.05);
            this._beam.rotation.z = -Math.PI / 2 + Math.sin(time * 2) * 0.15;
            this._beam.material.opacity = 0.2 + Math.sin(time * 4) * 0.03;

            // Illuminate nearby stalactites/stalagmites
            for (var sj = 0; sj < this._stalactites.length; sj++) {
                var sd = Math.abs(this._stalactites[sj].position.x - pathX);
                this._stalactites[sj].material.opacity = sd < 0.4 ? 0.5 + (1 - sd / 0.4) * 0.3 : 0.3;
            }
            for (var sgj = 0; sgj < this._stalagmites.length; sgj++) {
                var sgd = Math.abs(this._stalagmites[sgj].position.x - pathX);
                this._stalagmites[sgj].material.opacity = sgd < 0.4 ? 0.5 + (1 - sgd / 0.4) * 0.3 : 0.3;
            }

            // Discover crystals when near
            for (var ci = 0; ci < this._crystals.length; ci++) {
                var cr = this._crystals[ci];
                var cd = Math.sqrt(Math.pow(cr.mesh.position.x - pathX, 2) + Math.pow(cr.mesh.position.y - pathY, 2));
                if (cd < 0.3 && !cr.discovered) {
                    cr.discovered = true;
                }
                if (cr.discovered) {
                    cr.mesh.visible = true;
                    cr.glow = Math.min(1, cr.glow + delta * 2);
                    cr.mesh.material.opacity = cr.glow * 0.8;
                    cr.mesh.rotation.y = time * 2 + ci;
                    cr.mesh.scale.setScalar(0.5 + cr.glow * 0.8);

                    // Show aura on nearest discovered crystal
                    if (cd < 0.2) {
                        this._crystalAura.visible = true;
                        this._crystalAura.position.copy(cr.mesh.position);
                        this._crystalAura.material.opacity = 0.15 + Math.sin(time * 3) * 0.05;
                        this._crystalAura.material.color.copy(cr.mesh.material.color);
                        this._crystalAura.scale.setScalar(1 + Math.sin(time * 4) * 0.2);
                    }
                }
            }

            // Water drips from stalactites
            if (time - this._lastDrip > 0.5 + Math.random() * 0.5) {
                var dripStal = this._stalactites[Math.floor(Math.random() * this._stalactites.length)];
                this._emitDrip(dripStal.position.x, oy + 0.3);
                this._lastDrip = time;
            }

            // Cave bg stays dark
            this._caveBg.material.opacity = 0.6;
        } else if (progress < 0.88) {
            // Phase 4: All crystals glow together
            var t4 = (progress - 0.75) / 0.13;

            for (var ck = 0; ck < this._crystals.length; ck++) {
                var cr2 = this._crystals[ck];
                cr2.mesh.visible = true;
                cr2.mesh.material.opacity = 0.8 + Math.sin(time * 3 + ck) * 0.15;
                cr2.mesh.rotation.y = time * 2 + ck;
                cr2.mesh.scale.setScalar(1.3 + Math.sin(time * 2 + ck * 0.5) * 0.15);
            }

            this._crystalAura.visible = false;
            this._beam.material.opacity = 0.2 * (1 - t4 * 0.5);

            model.position.set(ox, oy, orig.z);
            model.rotation.z = 0;
        } else {
            // Phase 5: Cave fades
            var t5 = (progress - 0.88) / 0.12;

            this._caveBg.material.opacity = 0.6 * (1 - t5);
            this._beam.material.opacity = 0.1 * (1 - t5);
            for (var sl = 0; sl < this._stalactites.length; sl++) {
                this._stalactites[sl].material.opacity = 0.5 * (1 - t5);
            }
            for (var sgk = 0; sgk < this._stalagmites.length; sgk++) {
                this._stalagmites[sgk].material.opacity = 0.5 * (1 - t5);
            }
            for (var cl = 0; cl < this._crystals.length; cl++) {
                this._crystals[cl].mesh.material.opacity = 0.8 * (1 - t5);
            }

            model.position.set(ox, oy, orig.z);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update water drips
        for (var di = 0; di < this._drips.length; di++) {
            var dp = this._drips[di];
            if (dp.life <= 0) continue;
            dp.life -= delta;
            if (dp.life <= 0) { dp.mesh.visible = false; continue; }
            dp.vy -= 3.0 * delta;
            dp.mesh.position.y += dp.vy * delta;
            dp.mesh.material.opacity = 0.6 * (dp.life / dp.maxLife);
            // Elongate as it falls
            dp.mesh.scale.set(0.8, 1 + Math.abs(dp.vy) * 0.3, 0.8);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._caveBg) { scene.remove(this._caveBg); this._caveBg.geometry.dispose(); this._caveBg.material.dispose(); }
        if (this._beam) { scene.remove(this._beam); this._beam.geometry.dispose(); this._beam.material.dispose(); }
        if (this._stalactites) {
            this._stalactites.forEach(function(s) { scene.remove(s); s.geometry.dispose(); s.material.dispose(); });
        }
        if (this._stalagmites) {
            this._stalagmites.forEach(function(s) { scene.remove(s); s.geometry.dispose(); s.material.dispose(); });
        }
        if (this._crystals) {
            this._crystals.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); });
        }
        if (this._drips) {
            this._drips.forEach(function(d) { scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); });
        }
        if (this._crystalAura) { scene.remove(this._crystalAura); this._crystalAura.geometry.dispose(); this._crystalAura.material.dispose(); }
        this._caveBg = this._beam = this._stalactites = this._stalagmites = this._crystals = this._drips = this._crystalAura = null;
    }
};
