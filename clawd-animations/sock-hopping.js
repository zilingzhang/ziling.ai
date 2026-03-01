export default {
    name: 'Sock Hopping',
    label: 'sock-hopping',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Jukebox glow (box shape with colored light)
        var jukeGeo = new THREE.BoxGeometry(0.1, 0.15, 0.06);
        var jukeMat = new THREE.MeshBasicMaterial({
            color: 0xff6688, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._jukebox = new THREE.Mesh(jukeGeo, jukeMat);
        this._jukebox.position.set(this._origPos.x + 0.5, this._origPos.y - 0.05, -0.1);
        scene.add(this._jukebox);

        // Jukebox glow aura
        var jukeGlowGeo = new THREE.SphereGeometry(0.12, 10, 10);
        var jukeGlowMat = new THREE.MeshBasicMaterial({
            color: 0xff44aa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._jukeGlow = new THREE.Mesh(jukeGlowGeo, jukeGlowMat);
        this._jukeGlow.position.copy(this._jukebox.position);
        scene.add(this._jukeGlow);

        // Checkered floor tiles (alternating lit squares)
        this._floorTiles = [];
        var tileGeo = new THREE.PlaneGeometry(0.1, 0.1);
        for (var i = 0; i < 16; i++) {
            var col = i % 4;
            var row = Math.floor(i / 4);
            var isLight = (col + row) % 2 === 0;
            var tMat = new THREE.MeshBasicMaterial({
                color: isLight ? 0x44dddd : 0xff88cc,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            var tile = new THREE.Mesh(tileGeo, tMat);
            tile.rotation.x = -Math.PI / 2;
            tile.position.set(
                this._origPos.x - 0.15 + col * 0.1,
                this._origPos.y - 0.2,
                -0.15 + row * 0.1
            );
            tile.visible = false;
            scene.add(tile);
            this._floorTiles.push({ mesh: tile, isLight: isLight, phase: (col + row) * Math.PI / 4 });
        }

        // Circle skirt spin disc (expanding during twirls)
        var skirtGeo = new THREE.RingGeometry(0.03, 0.12, 24);
        var skirtMat = new THREE.MeshBasicMaterial({
            color: 0xff88cc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this._skirt = new THREE.Mesh(skirtGeo, skirtMat);
        this._skirt.rotation.x = -Math.PI / 2;
        this._skirt.visible = false;
        scene.add(this._skirt);

        // Cherry cola sparkles
        this._sparkles = [];
        var sparkGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var j = 0; j < 20; j++) {
            var sColors = [0xff6688, 0x44dddd, 0xffcc44, 0xff88cc, 0x88ddff];
            var sMat = new THREE.MeshBasicMaterial({
                color: sColors[j % sColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spark = new THREE.Mesh(sparkGeo, sMat);
            spark.visible = false;
            scene.add(spark);
            this._sparkles.push({ mesh: spark, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._sparkIdx = 0;

        // Music note particles
        this._notes = [];
        var noteGeo = new THREE.SphereGeometry(0.012, 6, 6);
        for (var k = 0; k < 6; k++) {
            var nMat = new THREE.MeshBasicMaterial({
                color: 0xffcc44, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var note = new THREE.Mesh(noteGeo, nMat);
            note.visible = false;
            scene.add(note);
            this._notes.push({ mesh: note, life: 0, maxLife: 0, vx: 0, vy: 0, wobble: 0 });
        }
        this._noteIdx = 0;

        this._lastSparkle = 0;
        this._lastNote = 0;
    },
    _emitSparkles(x, y, count) {
        for (var i = 0; i < count; i++) {
            var s = this._sparkles[this._sparkIdx % this._sparkles.length];
            this._sparkIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y + (Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.06);
            var angle = Math.random() * Math.PI * 2;
            var spd = 0.4 + Math.random() * 0.8;
            s.vx = Math.cos(angle) * spd;
            s.vy = Math.sin(angle) * spd * 0.5 + 0.3;
            s.vz = (Math.random() - 0.5) * 0.2;
            s.life = 0.4 + Math.random() * 0.3;
            s.maxLife = s.life;
            s.mesh.material.opacity = 0.8;
        }
    },
    _emitNote(x, y) {
        var n = this._notes[this._noteIdx % this._notes.length];
        this._noteIdx++;
        n.mesh.visible = true;
        n.mesh.position.set(x, y + 0.1, 0);
        n.vx = (Math.random() - 0.5) * 0.3;
        n.vy = 0.4 + Math.random() * 0.3;
        n.wobble = (Math.random() - 0.5) * 4;
        n.life = 1.2 + Math.random() * 0.5;
        n.maxLife = n.life;
        n.mesh.material.opacity = 0.6;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        // Rock'n'roll BPM (~150)
        var bpm = 150;
        var beat = (time * bpm / 60) % 1.0;
        var onBeat = beat < 0.15;

        if (progress < 0.08) {
            // Scene fades in: jukebox, floor
            var t = progress / 0.08;
            this._jukebox.material.opacity = t * 0.5;
            this._jukeGlow.material.opacity = t * 0.15;

            for (var ti = 0; ti < this._floorTiles.length; ti++) {
                this._floorTiles[ti].mesh.visible = true;
                this._floorTiles[ti].mesh.material.opacity = t * 0.06;
            }
            model.position.set(orig.x, orig.y, orig.z);
        } else if (progress < 0.30) {
            // Bouncy dance begins
            var t2 = (progress - 0.08) / 0.22;
            var bounceH = Math.abs(Math.sin(time * bpm / 60 * Math.PI)) * 0.1 * t2;
            var hopX = Math.sin(time * 3) * 0.1 * t2;

            model.position.set(orig.x + hopX, orig.y + bounceH, orig.z);
            model.rotation.z = hopX * 0.3;

            if (onBeat) {
                model.scale.set(gs * (1 + t2 * 0.06), gs * (1 - t2 * 0.05), gs);
            } else {
                model.scale.set(gs * (1 - t2 * 0.03), gs * (1 + t2 * 0.04), gs);
            }

            // Jukebox pulses
            this._jukebox.material.opacity = 0.5;
            this._jukeGlow.material.opacity = 0.15 + (onBeat ? 0.1 * t2 : 0);
            var jukeHue = (time * 0.3) % 1.0;
            this._jukeGlow.material.color.setHSL(jukeHue > 0.5 ? 0.95 : 0.5, 1.0, 0.5);

            // Floor tiles alternating
            for (var ti2 = 0; ti2 < this._floorTiles.length; ti2++) {
                var ft = this._floorTiles[ti2];
                var tilePulse = Math.sin(time * 4 + ft.phase);
                ft.mesh.material.opacity = 0.06 + Math.max(0, tilePulse) * 0.08 * t2;
            }

            // Music notes from jukebox
            if (time - this._lastNote > 0.4) {
                this._emitNote(this._jukebox.position.x, this._jukebox.position.y);
                this._lastNote = time;
            }
        } else if (progress < 0.55) {
            // Full dance with twirls
            var t3 = (progress - 0.30) / 0.25;
            var danceH = Math.abs(Math.sin(time * bpm / 60 * Math.PI)) * 0.12;
            var danceX = Math.sin(time * 2.5) * 0.15;

            // Periodic twirls
            var twirlPhase = (t3 * 3) % 1.0;
            var isTwirling = twirlPhase < 0.3;

            if (isTwirling) {
                var twirlT = twirlPhase / 0.3;
                model.rotation.z = twirlT * Math.PI * 4;
                // Skirt expands during twirl
                this._skirt.visible = true;
                this._skirt.position.set(orig.x + danceX, orig.y - 0.1, 0);
                this._skirt.scale.setScalar(0.5 + twirlT * 1.5);
                this._skirt.material.opacity = 0.2 * (1 - twirlT * 0.5);
                this._skirt.rotation.z = twirlT * Math.PI * 3;
            } else {
                model.rotation.z = danceX * 0.3;
                this._skirt.visible = false;
            }

            model.position.set(orig.x + danceX, orig.y + danceH, orig.z);

            if (onBeat) {
                model.scale.set(gs * 1.07, gs * 0.91, gs);
            } else {
                model.scale.set(gs * 0.96, gs * 1.04, gs);
            }

            // Floor tiles cycle
            for (var ti3 = 0; ti3 < this._floorTiles.length; ti3++) {
                var ft2 = this._floorTiles[ti3];
                var tilePulse2 = Math.sin(time * 5 + ft2.phase);
                ft2.mesh.material.opacity = 0.06 + Math.max(0, tilePulse2) * 0.12;
                var tileHue = (time * 0.4 + ft2.phase / (Math.PI * 2)) % 1.0;
                ft2.mesh.material.color.setHSL(ft2.isLight ? tileHue : (tileHue + 0.5) % 1.0, 1.0, 0.5);
            }

            this._jukeGlow.material.opacity = 0.15 + (onBeat ? 0.12 : 0);

            // Sparkles during dance
            if (time - this._lastSparkle > 0.12) {
                this._emitSparkles(orig.x + danceX, orig.y + danceH, 2);
                this._lastSparkle = time;
            }

            if (time - this._lastNote > 0.35) {
                this._emitNote(this._jukebox.position.x, this._jukebox.position.y);
                this._lastNote = time;
            }
        } else if (progress < 0.78) {
            // Peak energy: big bounces and twirls
            var t4 = (progress - 0.55) / 0.23;
            var bigBounce = Math.abs(Math.sin(time * bpm / 60 * Math.PI)) * 0.15;
            var bigX = Math.sin(time * 3) * 0.2;

            model.position.set(orig.x + bigX, orig.y + bigBounce, orig.z);

            // More frequent twirls
            var peakTwirl = ((t4 * 5) % 1.0);
            if (peakTwirl < 0.25) {
                var ptT = peakTwirl / 0.25;
                model.rotation.z = ptT * Math.PI * 6;
                this._skirt.visible = true;
                this._skirt.position.set(orig.x + bigX, orig.y - 0.1, 0);
                this._skirt.scale.setScalar(0.5 + ptT * 2.0);
                this._skirt.material.opacity = 0.25 * (1 - ptT * 0.5);
                this._skirt.rotation.z = ptT * Math.PI * 4;
            } else {
                model.rotation.z = bigX * 0.35;
                this._skirt.visible = false;
            }

            if (onBeat) {
                model.scale.set(gs * 1.08, gs * 0.88, gs);
            } else {
                model.scale.set(gs * 0.95, gs * 1.05, gs);
            }

            for (var ti4 = 0; ti4 < this._floorTiles.length; ti4++) {
                var ft3 = this._floorTiles[ti4];
                ft3.mesh.material.opacity = 0.08 + (onBeat ? 0.15 : Math.max(0, Math.sin(time * 6 + ft3.phase)) * 0.1);
            }

            this._jukeGlow.material.opacity = 0.2 + Math.sin(time * 5) * 0.08;

            if (time - this._lastSparkle > 0.08) {
                this._emitSparkles(orig.x + bigX, orig.y + bigBounce, 3);
                this._lastSparkle = time;
            }
        } else {
            // Wind down, jukebox fades
            var t5 = (progress - 0.78) / 0.22;
            var fadeBounce = Math.abs(Math.sin(time * 4)) * 0.06 * (1 - t5);
            model.position.set(orig.x, orig.y + fadeBounce, orig.z);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            this._skirt.visible = false;
            this._jukebox.material.opacity = 0.5 * (1 - t5);
            this._jukeGlow.material.opacity = 0.15 * (1 - t5);

            for (var ti5 = 0; ti5 < this._floorTiles.length; ti5++) {
                this._floorTiles[ti5].mesh.material.opacity = 0.08 * (1 - t5);
                if (t5 > 0.8) this._floorTiles[ti5].mesh.visible = false;
            }
        }

        // Update sparkles
        for (var si = 0; si < this._sparkles.length; si++) {
            var sp = this._sparkles[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.mesh.position.z += sp.vz * delta;
            sp.vy -= 1.5 * delta;
            sp.mesh.material.opacity = 0.8 * (sp.life / sp.maxLife);
        }

        // Update music notes (float up with wobble)
        for (var ni = 0; ni < this._notes.length; ni++) {
            var np = this._notes[ni];
            if (np.life <= 0) continue;
            np.life -= delta;
            if (np.life <= 0) { np.mesh.visible = false; continue; }
            np.mesh.position.x += np.vx * delta + Math.sin(time * np.wobble) * 0.002;
            np.mesh.position.y += np.vy * delta;
            np.mesh.material.opacity = 0.6 * (np.life / np.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._jukebox) {
            scene.remove(this._jukebox);
            this._jukebox.geometry.dispose();
            this._jukebox.material.dispose();
        }
        if (this._jukeGlow) {
            scene.remove(this._jukeGlow);
            this._jukeGlow.geometry.dispose();
            this._jukeGlow.material.dispose();
        }
        if (this._floorTiles) {
            this._floorTiles.forEach(function(t) {
                scene.remove(t.mesh);
                t.mesh.geometry.dispose();
                t.mesh.material.dispose();
            });
        }
        if (this._skirt) {
            scene.remove(this._skirt);
            this._skirt.geometry.dispose();
            this._skirt.material.dispose();
        }
        if (this._sparkles) {
            this._sparkles.forEach(function(s) {
                scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                s.mesh.material.dispose();
            });
        }
        if (this._notes) {
            this._notes.forEach(function(n) {
                scene.remove(n.mesh);
                n.mesh.geometry.dispose();
                n.mesh.material.dispose();
            });
        }
        this._jukebox = this._jukeGlow = this._floorTiles = this._skirt = this._sparkles = this._notes = null;
    }
};
