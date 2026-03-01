export default {
    name: 'Puttering',
    label: 'puttering',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Interaction sparkles
        this._sparkles = [];
        var sparkGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var i = 0; i < 25; i++) {
            var spColors = [0xffdd88, 0xffcc66, 0xffeeaa, 0xeebb55, 0xffddaa];
            var spMat = new THREE.MeshBasicMaterial({
                color: spColors[i % spColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sp = new THREE.Mesh(sparkGeo, spMat);
            sp.visible = false;
            scene.add(sp);
            this._sparkles.push({ mesh: sp, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._spkIdx = 0;

        // Whistling note particles (small torus rings)
        this._notes = [];
        var noteGeo = new THREE.TorusGeometry(0.02, 0.005, 6, 12);
        for (var j = 0; j < 8; j++) {
            var nColors = [0xffbb88, 0xffaa77, 0xffcc99, 0xeebb88];
            var nMat = new THREE.MeshBasicMaterial({
                color: nColors[j % nColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var note = new THREE.Mesh(noteGeo, nMat);
            note.visible = false;
            scene.add(note);
            this._notes.push({ mesh: note, life: 0, maxLife: 0, vx: 0, vy: 0 });
        }
        this._noteIdx = 0;

        // Random "items" scattered around the area (small cubes to interact with)
        this._items = [];
        var itemGeo = new THREE.BoxGeometry(0.03, 0.03, 0.03);
        var itemPositions = [
            { x: ox - 0.4, y: oy - 0.1 },
            { x: ox + 0.3, y: oy + 0.15 },
            { x: ox - 0.2, y: oy + 0.2 },
            { x: ox + 0.45, y: oy - 0.15 },
            { x: ox + 0.1, y: oy - 0.2 },
            { x: ox - 0.35, y: oy + 0.1 }
        ];
        var itemColors = [0xcc8855, 0xaa7744, 0xbb9966, 0xddaa77, 0xccbb88, 0xbb8855];
        for (var k = 0; k < 6; k++) {
            var iMat = new THREE.MeshBasicMaterial({
                color: itemColors[k], transparent: true, opacity: 0,
                depthWrite: false
            });
            var item = new THREE.Mesh(itemGeo, iMat);
            item.position.set(itemPositions[k].x, itemPositions[k].y, 0);
            scene.add(item);
            this._items.push({
                mesh: item,
                ox: itemPositions[k].x,
                oy: itemPositions[k].y,
                visited: false
            });
        }

        // Dust motes (ambient floating particles)
        this._dustMotes = [];
        var dustGeo = new THREE.SphereGeometry(0.006, 4, 4);
        for (var m = 0; m < 15; m++) {
            var dmMat = new THREE.MeshBasicMaterial({
                color: 0xffeecc, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var dm = new THREE.Mesh(dustGeo, dmMat);
            dm.position.set(
                ox + (Math.random() - 0.5) * 1.2,
                oy + (Math.random() - 0.5) * 0.6,
                (Math.random() - 0.5) * 0.2
            );
            scene.add(dm);
            this._dustMotes.push({ mesh: dm, phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.5 });
        }

        this._currentTarget = 0;
        this._lastNote = 0;
        this._wanderAngle = 0;
    },
    _emitSparkle(x, y) {
        for (var i = 0; i < 2; i++) {
            var s = this._sparkles[this._spkIdx % this._sparkles.length];
            this._spkIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x + (Math.random() - 0.5) * 0.05, y + (Math.random() - 0.5) * 0.05, 0);
            var a = Math.random() * Math.PI * 2;
            var spd = 0.3 + Math.random() * 0.5;
            s.vx = Math.cos(a) * spd;
            s.vy = Math.sin(a) * spd + 0.3;
            s.vz = (Math.random() - 0.5) * 0.2;
            s.life = 0.4 + Math.random() * 0.3;
            s.maxLife = s.life;
            s.mesh.material.opacity = 0.7;
        }
    },
    _emitNote(x, y) {
        var n = this._notes[this._noteIdx % this._notes.length];
        this._noteIdx++;
        n.mesh.visible = true;
        n.mesh.position.set(x + 0.05, y + 0.1, 0);
        n.vx = 0.1 + Math.random() * 0.2;
        n.vy = 0.3 + Math.random() * 0.3;
        n.life = 1.2 + Math.random() * 0.5;
        n.maxLife = n.life;
        n.mesh.material.opacity = 0.6;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;
        var gs = this._origScale.x;

        // Ambient dust motes float gently
        for (var di = 0; di < this._dustMotes.length; di++) {
            var dm = this._dustMotes[di];
            dm.mesh.position.y += Math.sin(time * dm.speed + dm.phase) * delta * 0.02;
            dm.mesh.position.x += Math.cos(time * dm.speed * 0.7 + dm.phase) * delta * 0.01;
            dm.mesh.material.opacity = progress < 0.05 ? progress / 0.05 * 0.3 :
                (progress > 0.9 ? (1 - (progress - 0.9) / 0.1) * 0.3 : 0.3);
        }

        if (progress < 0.05) {
            // Items appear
            var t = progress / 0.05;
            for (var ii = 0; ii < this._items.length; ii++) {
                this._items[ii].mesh.material.opacity = t * 0.5;
            }
            model.position.set(ox, oy, oz);
        } else if (progress < 0.85) {
            // Main puttering phase - wander between items
            var t2 = (progress - 0.05) / 0.80;
            var targetIdx = Math.floor(t2 * this._items.length) % this._items.length;
            var target = this._items[targetIdx];

            // Amble toward current target
            var dx = target.ox - model.position.x;
            var dy = target.oy - model.position.y;
            var dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0.08) {
                // Walking toward target, unhurried
                model.position.x += dx * delta * 0.8;
                model.position.y += dy * delta * 0.8;
                // Gentle waddle
                model.rotation.z = Math.sin(time * 3) * 0.04;
                var hopPhase = Math.sin(time * 4);
                if (hopPhase > 0.8) {
                    model.scale.set(gs * 0.97, gs * 1.03, gs);
                } else {
                    model.scale.setScalar(gs);
                }
            } else {
                // At target, interact
                model.position.set(target.ox + 0.08, target.oy, oz);
                model.rotation.z = Math.sin(time * 2) * 0.02;

                if (!target.visited) {
                    this._emitSparkle(target.ox, target.oy);
                    target.visited = true;
                }

                // Tiny sparkle interaction
                if (Math.random() < 0.05) {
                    this._emitSparkle(target.ox, target.oy);
                }

                // Nudge item slightly
                target.mesh.position.x = target.ox + Math.sin(time * 2) * 0.01;
                target.mesh.rotation.y = Math.sin(time * 1.5) * 0.3;
            }

            // Items opacity
            for (var ij = 0; ij < this._items.length; ij++) {
                this._items[ij].mesh.material.opacity = 0.5 + (ij === targetIdx ? 0.3 : 0);
            }

            // Whistling notes periodically
            if (time - this._lastNote > 1.5 + Math.random() * 2.0) {
                this._emitNote(model.position.x, model.position.y);
                this._lastNote = time;
            }
        } else {
            // Settle back
            var t3 = (progress - 0.85) / 0.15;
            var retX = model.position.x + (ox - model.position.x) * t3;
            var retY = model.position.y + (oy - model.position.y) * t3;
            model.position.set(retX, retY, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            for (var ik = 0; ik < this._items.length; ik++) {
                this._items[ik].mesh.material.opacity = 0.5 * (1 - t3);
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
            sp.vy -= 0.5 * delta;
            sp.mesh.material.opacity = 0.7 * (sp.life / sp.maxLife);
            sp.mesh.scale.setScalar(0.5 + 0.5 * (sp.life / sp.maxLife));
        }

        // Update notes
        for (var ni = 0; ni < this._notes.length; ni++) {
            var np = this._notes[ni];
            if (np.life <= 0) continue;
            np.life -= delta;
            if (np.life <= 0) { np.mesh.visible = false; continue; }
            np.mesh.position.x += np.vx * delta;
            np.mesh.position.y += np.vy * delta;
            np.mesh.rotation.z += delta * 2;
            np.mesh.material.opacity = 0.6 * (np.life / np.maxLife);
            np.mesh.scale.setScalar(0.8 + 0.4 * (1 - np.life / np.maxLife));
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._sparkles) {
            this._sparkles.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._notes) {
            this._notes.forEach(function(n) { scene.remove(n.mesh); n.mesh.geometry.dispose(); n.mesh.material.dispose(); });
        }
        if (this._items) {
            this._items.forEach(function(i) { scene.remove(i.mesh); i.mesh.geometry.dispose(); i.mesh.material.dispose(); });
        }
        if (this._dustMotes) {
            this._dustMotes.forEach(function(d) { scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); });
        }
        this._sparkles = this._notes = this._items = this._dustMotes = null;
    }
};
