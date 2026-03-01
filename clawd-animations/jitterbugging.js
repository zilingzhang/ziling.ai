export default {
    name: 'Jitterbugging',
    label: 'jitterbugging',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Music note diamonds
        this._notes = [];
        var noteGeo = new THREE.OctahedronGeometry(0.03, 0);
        for (var i = 0; i < 15; i++) {
            var noteColors = [0xff44aa, 0x44aaff, 0xffaa44, 0xaa44ff, 0x44ffaa];
            var nMat = new THREE.MeshBasicMaterial({
                color: noteColors[i % noteColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var note = new THREE.Mesh(noteGeo, nMat);
            note.visible = false;
            scene.add(note);
            this._notes.push({ mesh: note, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0, spin: 0 });
        }
        this._noteIdx = 0;

        // Impact rings (tori that expand and fade on landing)
        this._rings = [];
        var ringGeo = new THREE.TorusGeometry(0.05, 0.008, 6, 16);
        for (var j = 0; j < 8; j++) {
            var rMat = new THREE.MeshBasicMaterial({
                color: 0xffdd44, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ring = new THREE.Mesh(ringGeo, rMat);
            ring.rotation.x = -Math.PI / 2;
            ring.visible = false;
            scene.add(ring);
            this._rings.push({ mesh: ring, life: 0, maxLife: 0, startScale: 1 });
        }
        this._ringIdx = 0;
        this._lastBeat = 0;
        this._lastNote = 0;
    },
    _emitNote(x, y) {
        var n = this._notes[this._noteIdx % this._notes.length];
        this._noteIdx++;
        n.mesh.visible = true;
        n.mesh.position.set(x + (Math.random() - 0.5) * 0.2, y + 0.1, (Math.random() - 0.5) * 0.1);
        var angle = Math.PI * 0.3 + Math.random() * Math.PI * 0.4;
        var spd = 1.0 + Math.random() * 1.5;
        n.vx = Math.cos(angle) * spd * (Math.random() > 0.5 ? 1 : -1);
        n.vy = Math.sin(angle) * spd;
        n.vz = (Math.random() - 0.5) * 0.5;
        n.life = 0.8 + Math.random() * 0.6;
        n.maxLife = n.life;
        n.spin = (Math.random() - 0.5) * 8;
        n.mesh.material.opacity = 1.0;
        n.mesh.scale.setScalar(0.5 + Math.random() * 1.0);
    },
    _emitRing(x, y) {
        var r = this._rings[this._ringIdx % this._rings.length];
        this._ringIdx++;
        r.mesh.visible = true;
        r.mesh.position.set(x, y - 0.18, 0);
        r.mesh.scale.setScalar(1);
        r.life = 0.4;
        r.maxLife = 0.4;
        r.mesh.material.opacity = 0.7;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        // BPM-based beat timing (fast swing tempo)
        var bpm = 220;
        var beatT = (time * bpm / 60) % 1.0;
        var onBeat = beatT < 0.15;

        if (progress < 0.10) {
            // Warming up: small bounces
            var t = progress / 0.10;
            var smallBounce = Math.abs(Math.sin(time * 6)) * 0.05 * t;
            model.position.set(orig.x, orig.y + smallBounce, orig.z);
            model.scale.set(gs * (1 + smallBounce * 0.5), gs * (1 - smallBounce * 0.3), gs);
        } else if (progress < 0.60) {
            // Full jitterbug: big lateral jumps
            var t2 = (progress - 0.10) / 0.50;
            var intensity = Math.min(t2 * 2, 1.0);
            var jumpCycle = Math.sin(time * 7);
            var lateralSwing = Math.sin(time * 3.5) * 0.5 * intensity;
            var jumpHeight = Math.abs(jumpCycle) * 0.2 * intensity;

            model.position.set(
                orig.x + lateralSwing,
                orig.y + jumpHeight,
                orig.z
            );

            // Squash on landing, stretch on jump
            if (jumpCycle > 0.8) {
                model.scale.set(gs * 1.08, gs * 0.88, gs);
            } else if (jumpCycle < -0.8) {
                model.scale.set(gs * 1.08, gs * 0.88, gs);
            } else {
                model.scale.set(gs * (1 - Math.abs(jumpCycle) * 0.04), gs * (1 + Math.abs(jumpCycle) * 0.06), gs);
            }

            model.rotation.z = lateralSwing * 0.15;

            // Emit notes and rings on beat
            if (onBeat && time - this._lastBeat > 0.2) {
                this._emitRing(model.position.x, orig.y);
                this._lastBeat = time;
            }
            if (time - this._lastNote > 0.15) {
                this._emitNote(model.position.x, model.position.y);
                this._lastNote = time;
            }
        } else if (progress < 0.80) {
            // Peak energy with spins
            var t3 = (progress - 0.60) / 0.20;
            var spinAngle = time * 12;
            var orbitRadius = 0.3 * Math.sin(t3 * Math.PI);
            var jumpH = Math.abs(Math.sin(time * 9)) * 0.25;

            model.position.set(
                orig.x + Math.sin(spinAngle * 0.3) * orbitRadius,
                orig.y + jumpH,
                orig.z
            );
            model.rotation.z = Math.sin(time * 8) * 0.3;
            model.scale.set(gs * (1 + Math.sin(time * 14) * 0.05), gs * (1 - Math.sin(time * 14) * 0.05), gs);

            if (onBeat && time - this._lastBeat > 0.15) {
                this._emitRing(model.position.x, orig.y);
                this._emitNote(model.position.x, model.position.y);
                this._lastBeat = time;
                this._lastNote = time;
            }
        } else if (progress < 0.95) {
            // Cool down: smaller bounces
            var t4 = (progress - 0.80) / 0.15;
            var fadeIntensity = 1 - t4;
            var smallBounce2 = Math.abs(Math.sin(time * 5)) * 0.08 * fadeIntensity;
            var lateralFade = Math.sin(time * 3) * 0.15 * fadeIntensity;

            model.position.set(orig.x + lateralFade, orig.y + smallBounce2, orig.z);
            model.rotation.z = lateralFade * 0.1;
            model.scale.set(gs, gs, gs);
        } else {
            // Rest
            var t5 = (progress - 0.95) / 0.05;
            model.position.set(orig.x, orig.y, orig.z);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update music note particles
        for (var ni = 0; ni < this._notes.length; ni++) {
            var note = this._notes[ni];
            if (note.life <= 0) continue;
            note.life -= delta;
            if (note.life <= 0) { note.mesh.visible = false; continue; }
            note.mesh.position.x += note.vx * delta;
            note.mesh.position.y += note.vy * delta;
            note.mesh.position.z += note.vz * delta;
            note.vy -= 1.0 * delta;
            note.mesh.rotation.z += note.spin * delta;
            note.mesh.material.opacity = note.life / note.maxLife;
        }

        // Update impact rings
        for (var ri = 0; ri < this._rings.length; ri++) {
            var ring = this._rings[ri];
            if (ring.life <= 0) continue;
            ring.life -= delta;
            if (ring.life <= 0) { ring.mesh.visible = false; continue; }
            var ringProgress = 1 - ring.life / ring.maxLife;
            ring.mesh.scale.setScalar(1 + ringProgress * 4);
            ring.mesh.material.opacity = 0.7 * (ring.life / ring.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._notes) {
            this._notes.forEach(function(n) {
                scene.remove(n.mesh);
                n.mesh.geometry.dispose();
                n.mesh.material.dispose();
            });
        }
        if (this._rings) {
            this._rings.forEach(function(r) {
                scene.remove(r.mesh);
                r.mesh.geometry.dispose();
                r.mesh.material.dispose();
            });
        }
        this._notes = this._rings = null;
    }
};
