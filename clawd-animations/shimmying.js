export default {
    name: 'Shimmying',
    label: 'shimmying',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Shimmer cascade particles (falling down body)
        this._shimmer = [];
        var shimGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var i = 0; i < 30; i++) {
            var sColors = [0xffaaff, 0xaaffff, 0xffffaa, 0xffaaaa, 0xaaaaff, 0xaaffaa];
            var sMat = new THREE.MeshBasicMaterial({
                color: sColors[i % sColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var shim = new THREE.Mesh(shimGeo, sMat);
            shim.visible = false;
            scene.add(shim);
            this._shimmer.push({ mesh: shim, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._shimIdx = 0;

        // Loose sparkle particles
        this._sparkles = [];
        var sparkGeo = new THREE.PlaneGeometry(0.012, 0.012);
        for (var j = 0; j < 20; j++) {
            var spColors = [0xffffff, 0xffddff, 0xddffff, 0xffffdd];
            var spMat = new THREE.MeshBasicMaterial({
                color: spColors[j % spColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            var sparkle = new THREE.Mesh(sparkGeo, spMat);
            sparkle.visible = false;
            scene.add(sparkle);
            this._sparkles.push({ mesh: sparkle, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0, rv: 0 });
        }
        this._sparkIdx = 0;

        // Dance energy glow (expanding ring)
        this._energyRings = [];
        var ringGeo = new THREE.RingGeometry(0.05, 0.07, 20);
        for (var k = 0; k < 4; k++) {
            var rColors = [0xff66ff, 0x66ffff, 0xffff66, 0xff6666];
            var rMat = new THREE.MeshBasicMaterial({
                color: rColors[k], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            var ring = new THREE.Mesh(ringGeo, rMat);
            ring.visible = false;
            scene.add(ring);
            this._energyRings.push({ mesh: ring, life: 0, maxLife: 0, scale: 0 });
        }
        this._ringIdx = 0;

        // Disco floor tiles
        this._tiles = [];
        var tileGeo = new THREE.PlaneGeometry(0.12, 0.12);
        for (var t = 0; t < 8; t++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: 0xff44ff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            var tile = new THREE.Mesh(tileGeo, tMat);
            tile.rotation.x = -Math.PI / 2;
            var col = t % 4;
            var row = Math.floor(t / 4);
            tile.position.set(
                this._origPos.x - 0.18 + col * 0.12,
                this._origPos.y - 0.2,
                -0.1 + row * 0.15
            );
            tile.visible = false;
            scene.add(tile);
            this._tiles.push({ mesh: tile, phase: t * Math.PI / 4 });
        }

        this._lastShimmer = 0;
        this._lastSparkle = 0;
        this._lastRing = 0;
    },
    _emitShimmer(x, y, amplitude) {
        for (var i = 0; i < 3; i++) {
            var s = this._shimmer[this._shimIdx % this._shimmer.length];
            this._shimIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(
                x + (Math.random() - 0.5) * amplitude * 0.3,
                y + 0.15 + Math.random() * 0.1,
                (Math.random() - 0.5) * 0.05
            );
            s.vx = (Math.random() - 0.5) * amplitude * 2;
            s.vy = -0.3 - Math.random() * 0.5;
            s.vz = (Math.random() - 0.5) * 0.2;
            s.life = 0.5 + Math.random() * 0.4;
            s.maxLife = s.life;
            s.mesh.material.opacity = 0.7;
        }
    },
    _emitSparkles(x, y) {
        for (var i = 0; i < 2; i++) {
            var sp = this._sparkles[this._sparkIdx % this._sparkles.length];
            this._sparkIdx++;
            sp.mesh.visible = true;
            sp.mesh.position.set(x + (Math.random() - 0.5) * 0.15, y + (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.1);
            var angle = Math.random() * Math.PI * 2;
            var spd = 0.3 + Math.random() * 0.8;
            sp.vx = Math.cos(angle) * spd;
            sp.vy = Math.sin(angle) * spd;
            sp.vz = (Math.random() - 0.5) * 0.3;
            sp.rv = (Math.random() - 0.5) * 10;
            sp.life = 0.6 + Math.random() * 0.4;
            sp.maxLife = sp.life;
            sp.mesh.material.opacity = 0.8;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        // Shimmy frequency and amplitude
        var shimmyFreq = 12;
        var shimmyBase = Math.sin(time * shimmyFreq);

        if (progress < 0.08) {
            // Start: tiles appear, gentle sway
            var t = progress / 0.08;
            for (var ti = 0; ti < this._tiles.length; ti++) {
                this._tiles[ti].mesh.visible = true;
                this._tiles[ti].mesh.material.opacity = t * 0.08;
            }
            model.position.set(orig.x, orig.y, orig.z);
        } else if (progress < 0.25) {
            // Shimmy begins: side-to-side vibration increases
            var t2 = (progress - 0.08) / 0.17;
            var amp = t2 * 0.06;
            var shimX = shimmyBase * amp;

            model.position.set(orig.x + shimX, orig.y, orig.z);
            model.rotation.z = shimX * 0.5;
            model.scale.set(gs * (1 + Math.abs(shimX) * 0.5), gs * (1 - Math.abs(shimX) * 0.3), gs);

            // Tiles pulse
            for (var ti2 = 0; ti2 < this._tiles.length; ti2++) {
                var tile = this._tiles[ti2];
                tile.mesh.material.opacity = 0.08 + Math.sin(time * 3 + tile.phase) * 0.04 * t2;
                var tHue = (time * 0.5 + tile.phase / (Math.PI * 2)) % 1.0;
                tile.mesh.material.color.setHSL(tHue, 1.0, 0.5);
            }

            // Start shimmer particles
            if (t2 > 0.3 && time - this._lastShimmer > 0.08) {
                this._emitShimmer(orig.x + shimX, orig.y, amp);
                this._lastShimmer = time;
            }
        } else if (progress < 0.60) {
            // Full shimmy: rapid shake, cascade particles, building energy
            var t3 = (progress - 0.25) / 0.35;
            var fullAmp = 0.06 + t3 * 0.06;
            var fullShimX = Math.sin(time * (shimmyFreq + t3 * 8)) * fullAmp;

            // Fabric wave effect: sine wave displacement
            var wavePhase = time * 10;
            var waveDisp = Math.sin(wavePhase) * 0.02 * (1 + t3);

            model.position.set(orig.x + fullShimX, orig.y + waveDisp, orig.z);
            model.rotation.z = fullShimX * 0.6;

            // Rapid scale oscillation (shimmy effect)
            var scaleOsc = Math.sin(time * shimmyFreq * 2) * 0.04;
            model.scale.set(gs * (1 + scaleOsc), gs * (1 - scaleOsc * 0.5), gs);

            // Tiles pulse with beat
            for (var ti3 = 0; ti3 < this._tiles.length; ti3++) {
                var tile2 = this._tiles[ti3];
                tile2.mesh.material.opacity = 0.08 + Math.max(0, Math.sin(time * 4 + tile2.phase)) * 0.1;
                var tHue2 = (time * 0.6 + tile2.phase / (Math.PI * 2)) % 1.0;
                tile2.mesh.material.color.setHSL(tHue2, 1.0, 0.5);
            }

            // Shimmer cascade
            if (time - this._lastShimmer > 0.05) {
                this._emitShimmer(orig.x + fullShimX, orig.y, fullAmp);
                this._lastShimmer = time;
            }

            // Sparkles shake loose
            if (time - this._lastSparkle > 0.12) {
                this._emitSparkles(orig.x + fullShimX, orig.y);
                this._lastSparkle = time;
            }

            // Energy rings at milestones
            if (t3 > 0.3 && time - this._lastRing > 0.6) {
                var er = this._energyRings[this._ringIdx % this._energyRings.length];
                this._ringIdx++;
                er.mesh.visible = true;
                er.mesh.position.set(orig.x, orig.y, 0);
                er.scale = 0.5;
                er.life = 0.8;
                er.maxLife = 0.8;
                er.mesh.material.opacity = 0.4;
                this._lastRing = time;
            }
        } else if (progress < 0.82) {
            // Peak shimmy: maximum amplitude, disco energy
            var t4 = (progress - 0.60) / 0.22;
            var peakAmp = 0.12;
            var peakFreq = shimmyFreq + 10;
            var peakShimX = Math.sin(time * peakFreq) * peakAmp;
            var peakWave = Math.sin(time * 14) * 0.03;

            model.position.set(orig.x + peakShimX, orig.y + peakWave, orig.z);
            model.rotation.z = peakShimX * 0.7;

            var peakOsc = Math.sin(time * peakFreq * 2) * 0.06;
            model.scale.set(gs * (1 + peakOsc), gs * (1 - peakOsc * 0.5), gs);

            for (var ti4 = 0; ti4 < this._tiles.length; ti4++) {
                var tile3 = this._tiles[ti4];
                tile3.mesh.material.opacity = 0.1 + Math.max(0, Math.sin(time * 6 + tile3.phase)) * 0.15;
                var tHue3 = (time * 0.8 + tile3.phase / (Math.PI * 2)) % 1.0;
                tile3.mesh.material.color.setHSL(tHue3, 1.0, 0.5);
            }

            if (time - this._lastShimmer > 0.04) {
                this._emitShimmer(orig.x + peakShimX, orig.y, peakAmp);
                this._lastShimmer = time;
            }
            if (time - this._lastSparkle > 0.08) {
                this._emitSparkles(orig.x + peakShimX, orig.y);
                this._lastSparkle = time;
            }
            if (time - this._lastRing > 0.4) {
                var er2 = this._energyRings[this._ringIdx % this._energyRings.length];
                this._ringIdx++;
                er2.mesh.visible = true;
                er2.mesh.position.set(orig.x, orig.y, 0);
                er2.scale = 0.5;
                er2.life = 0.8;
                er2.maxLife = 0.8;
                er2.mesh.material.opacity = 0.5;
                this._lastRing = time;
            }
        } else {
            // Wind down
            var t5 = (progress - 0.82) / 0.18;
            var fadeAmp = 0.12 * (1 - t5);
            var fadeShimX = Math.sin(time * shimmyFreq) * fadeAmp;

            model.position.set(orig.x + fadeShimX, orig.y, orig.z);
            model.rotation.z = fadeShimX * 0.5 * (1 - t5);
            model.scale.set(gs * (1 + fadeAmp * 0.2), gs * (1 - fadeAmp * 0.1), gs);

            for (var ti5 = 0; ti5 < this._tiles.length; ti5++) {
                this._tiles[ti5].mesh.material.opacity = 0.1 * (1 - t5);
                if (t5 > 0.8) this._tiles[ti5].mesh.visible = false;
            }

            if (t5 > 0.8) {
                model.position.copy(orig);
                model.rotation.z = 0;
                model.scale.copy(this._origScale);
            }
        }

        // Update shimmer particles
        for (var si = 0; si < this._shimmer.length; si++) {
            var sp = this._shimmer[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.mesh.position.z += sp.vz * delta;
            sp.mesh.material.opacity = 0.7 * (sp.life / sp.maxLife);
        }

        // Update sparkles
        for (var ski = 0; ski < this._sparkles.length; ski++) {
            var skp = this._sparkles[ski];
            if (skp.life <= 0) continue;
            skp.life -= delta;
            if (skp.life <= 0) { skp.mesh.visible = false; continue; }
            skp.mesh.position.x += skp.vx * delta;
            skp.mesh.position.y += skp.vy * delta;
            skp.mesh.position.z += skp.vz * delta;
            skp.vy -= 0.5 * delta;
            skp.mesh.rotation.z += skp.rv * delta;
            skp.mesh.material.opacity = 0.8 * (skp.life / skp.maxLife);
        }

        // Update energy rings
        for (var ri = 0; ri < this._energyRings.length; ri++) {
            var er3 = this._energyRings[ri];
            if (er3.life <= 0) continue;
            er3.life -= delta;
            if (er3.life <= 0) { er3.mesh.visible = false; continue; }
            er3.scale += delta * 2.5;
            er3.mesh.scale.setScalar(er3.scale);
            er3.mesh.material.opacity = 0.5 * (er3.life / er3.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._shimmer) {
            this._shimmer.forEach(function(s) {
                scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                s.mesh.material.dispose();
            });
        }
        if (this._sparkles) {
            this._sparkles.forEach(function(s) {
                scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                s.mesh.material.dispose();
            });
        }
        if (this._energyRings) {
            this._energyRings.forEach(function(r) {
                scene.remove(r.mesh);
                r.mesh.geometry.dispose();
                r.mesh.material.dispose();
            });
        }
        if (this._tiles) {
            this._tiles.forEach(function(t) {
                scene.remove(t.mesh);
                t.mesh.geometry.dispose();
                t.mesh.material.dispose();
            });
        }
        this._shimmer = this._sparkles = this._energyRings = this._tiles = null;
    }
};
