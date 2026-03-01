export default {
    name: 'Composing',
    label: 'composing',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Musical staff - 5 horizontal lines
        this._staffLines = [];
        var staffMat = new THREE.LineBasicMaterial({
            color: 0xcccccc, transparent: true, opacity: 0
        });
        for (var i = 0; i < 5; i++) {
            var pts = [];
            var ly = oy - 0.12 + i * 0.04;
            pts.push(new THREE.Vector3(ox - 0.55, ly, -0.02));
            pts.push(new THREE.Vector3(ox + 0.35, ly, -0.02));
            var geo = new THREE.BufferGeometry().setFromPoints(pts);
            var line = new THREE.Line(geo, staffMat.clone());
            line.visible = false;
            scene.add(line);
            this._staffLines.push(line);
        }

        // Notes - sphere head + thin box stem
        this._notes = [];
        var notePositions = [
            { x: -0.40, line: 0 }, { x: -0.32, line: 2 }, { x: -0.24, line: 1 },
            { x: -0.16, line: 3 }, { x: -0.08, line: 4 }, { x: 0.0, line: 2 },
            { x: 0.08, line: 1 }, { x: 0.16, line: 3 }, { x: 0.24, line: 0 },
            { x: 0.30, line: 4 }
        ];
        var noteColors = [0xff6688, 0xff8844, 0xffcc33, 0x44cc66, 0x4488ff,
                          0x8844ff, 0xff44aa, 0x44ddcc, 0xffaa22, 0xcc66ff];
        for (var ni = 0; ni < notePositions.length; ni++) {
            var noteY = oy - 0.12 + notePositions[ni].line * 0.04;
            // Note head
            var headGeo = new THREE.SphereGeometry(0.018, 8, 8);
            var headMat = new THREE.MeshBasicMaterial({
                color: noteColors[ni], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var head = new THREE.Mesh(headGeo, headMat);
            head.position.set(ox + notePositions[ni].x, noteY, 0);
            head.visible = false;
            scene.add(head);
            // Note stem
            var stemGeo = new THREE.BoxGeometry(0.004, 0.06, 0.004);
            var stemMat = new THREE.MeshBasicMaterial({
                color: noteColors[ni], transparent: true, opacity: 0
            });
            var stem = new THREE.Mesh(stemGeo, stemMat);
            stem.position.set(ox + notePositions[ni].x + 0.015, noteY + 0.03, 0);
            stem.visible = false;
            scene.add(stem);

            this._notes.push({
                head: head, stem: stem,
                baseX: ox + notePositions[ni].x,
                baseY: noteY,
                color: noteColors[ni],
                appearTime: 0.12 + ni * 0.06,
                size: 0.8 + (ni > 6 ? (ni - 6) * 0.3 : 0)
            });
        }

        // Tone-glow rings (one per note)
        this._toneRings = [];
        var ringGeo = new THREE.TorusGeometry(0.03, 0.005, 8, 20);
        for (var ri = 0; ri < notePositions.length; ri++) {
            var rMat = new THREE.MeshBasicMaterial({
                color: noteColors[ri], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ring = new THREE.Mesh(ringGeo, rMat);
            ring.visible = false;
            scene.add(ring);
            this._toneRings.push({
                mesh: ring, life: 0, maxLife: 0,
                x: 0, y: 0
            });
        }
        this._ringIdx = 0;

        // Harmonic shimmer particles
        this._sparkles = [];
        var spkGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var si = 0; si < 25; si++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: noteColors[si % noteColors.length],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spk = new THREE.Mesh(spkGeo, sMat);
            spk.visible = false;
            scene.add(spk);
            this._sparkles.push({
                mesh: spk, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._spkIdx = 0;

        // Musical glow
        var glowGeo = new THREE.SphereGeometry(0.4, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffaadd, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox - 0.05, oy - 0.05, -0.05);
        scene.add(this._glow);

        this._lastNote = -1;
    },
    _emitSparkle(x, y, color) {
        var s = this._sparkles[this._spkIdx % this._sparkles.length];
        this._spkIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x, y, 0.02);
        s.mesh.material.color.setHex(color);
        var a = Math.random() * Math.PI * 2;
        s.vx = Math.cos(a) * (0.2 + Math.random() * 0.4);
        s.vy = Math.sin(a) * (0.2 + Math.random() * 0.4);
        s.life = 0.4 + Math.random() * 0.4;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.8;
    },
    _emitRing(x, y, color) {
        var r = this._toneRings[this._ringIdx % this._toneRings.length];
        this._ringIdx++;
        r.mesh.visible = true;
        r.mesh.position.set(x, y, 0.01);
        r.mesh.material.color.setHex(color);
        r.mesh.scale.setScalar(0.5);
        r.life = 0.6;
        r.maxLife = 0.6;
        r.x = x;
        r.y = y;
        r.mesh.material.opacity = 0.7;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.08) {
            // Phase 1: Staff lines appear
            var t = progress / 0.08;
            for (var si = 0; si < this._staffLines.length; si++) {
                this._staffLines[si].visible = true;
                this._staffLines[si].material.opacity = t * 0.5;
            }
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.70) {
            // Phase 2: Notes appear sequentially with tone-glow rings
            var t2 = (progress - 0.08) / 0.62;
            for (var sl = 0; sl < this._staffLines.length; sl++) {
                this._staffLines[sl].material.opacity = 0.5;
            }

            for (var ni = 0; ni < this._notes.length; ni++) {
                var note = this._notes[ni];
                var noteProgress = (progress - note.appearTime) / 0.06;
                if (noteProgress < 0) continue;
                var nT = Math.min(1, noteProgress);
                note.head.visible = true;
                note.stem.visible = true;
                var scl = nT * note.size;
                note.head.material.opacity = nT * 0.8;
                note.stem.material.opacity = nT * 0.6;
                note.head.scale.setScalar(scl);
                note.stem.scale.set(1, scl, 1);
                // Bob notes gently
                note.head.position.y = note.baseY + Math.sin(time * 2 + ni) * 0.005;
                note.stem.position.y = note.baseY + 0.03 + Math.sin(time * 2 + ni) * 0.005;

                // Emit ring when note first appears
                if (nT > 0.1 && nT < 0.3 && ni !== this._lastNote) {
                    this._emitRing(note.baseX, note.baseY, note.color);
                    this._emitSparkle(note.baseX, note.baseY, note.color);
                    this._emitSparkle(note.baseX, note.baseY, note.color);
                    if (ni > this._lastNote) this._lastNote = ni;
                }
            }

            // Melody flow effect - sparkles drift right
            if (Math.random() < 0.04 + t2 * 0.06) {
                var randNote = this._notes[Math.floor(Math.random() * Math.min(this._lastNote + 1, this._notes.length))];
                if (randNote && randNote.head.visible) {
                    this._emitSparkle(randNote.baseX, randNote.baseY, randNote.color);
                }
            }

            model.position.set(ox + 0.15, oy + Math.sin(time * 1.2) * 0.008, oz);
            model.rotation.z = Math.sin(time * 0.8) * 0.02;
        } else if (progress < 0.85) {
            // Phase 3: Crescendo - larger notes pulse, harmonics shimmer
            var t3 = (progress - 0.70) / 0.15;
            var pulse = Math.sin(t3 * Math.PI * 4);

            for (var ni2 = 0; ni2 < this._notes.length; ni2++) {
                var n2 = this._notes[ni2];
                var sizeMult = n2.size + t3 * 0.3 + pulse * 0.1;
                n2.head.scale.setScalar(sizeMult);
                n2.head.material.opacity = 0.8 + pulse * 0.15;
                n2.head.position.y = n2.baseY + Math.sin(time * 3 + ni2 * 0.5) * 0.01;
            }

            // Lots of sparkles
            if (Math.random() < 0.15) {
                var rn = this._notes[Math.floor(Math.random() * this._notes.length)];
                this._emitSparkle(rn.baseX, rn.baseY, rn.color);
            }

            this._glow.material.opacity = t3 * 0.15;
            this._glow.scale.setScalar(1 + t3 * 0.3);

            model.position.set(ox + 0.15, oy + Math.sin(time * 2) * 0.01, oz);
            model.rotation.z = Math.sin(time * 1.5) * 0.03;
        } else {
            // Phase 4: Fade out
            var t4 = (progress - 0.85) / 0.15;
            var fadeOut = 1 - t4;
            for (var sl2 = 0; sl2 < this._staffLines.length; sl2++) {
                this._staffLines[sl2].material.opacity = 0.5 * fadeOut;
            }
            for (var ni3 = 0; ni3 < this._notes.length; ni3++) {
                this._notes[ni3].head.material.opacity *= fadeOut;
                this._notes[ni3].stem.material.opacity *= fadeOut;
            }
            this._glow.material.opacity *= fadeOut;
            model.position.set(ox + 0.15 * fadeOut, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update tone rings
        for (var tri = 0; tri < this._toneRings.length; tri++) {
            var tr = this._toneRings[tri];
            if (tr.life <= 0) continue;
            tr.life -= delta;
            if (tr.life <= 0) { tr.mesh.visible = false; continue; }
            var trl = tr.life / tr.maxLife;
            tr.mesh.material.opacity = trl * 0.6;
            tr.mesh.scale.setScalar(0.5 + (1 - trl) * 2.5);
        }

        // Update sparkles
        for (var spi = 0; spi < this._sparkles.length; spi++) {
            var sp = this._sparkles[spi];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            var lr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = lr * 0.7;
            sp.mesh.scale.setScalar(0.5 + (1 - lr) * 0.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._staffLines) {
            this._staffLines.forEach(function(l) { scene.remove(l); l.geometry.dispose(); l.material.dispose(); });
        }
        if (this._notes) {
            this._notes.forEach(function(n) {
                scene.remove(n.head); n.head.geometry.dispose(); n.head.material.dispose();
                scene.remove(n.stem); n.stem.geometry.dispose(); n.stem.material.dispose();
            });
        }
        if (this._toneRings) {
            this._toneRings.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); });
        }
        if (this._sparkles) {
            this._sparkles.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        this._staffLines = this._notes = this._toneRings = this._sparkles = this._glow = null;
    }
};
