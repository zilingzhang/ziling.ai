export default {
    name: 'Combobulating',
    label: 'combobulating',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // 10 varied shape parts that will assemble into a grid
        this._parts = [];
        var geos = [
            new THREE.BoxGeometry(0.06, 0.06, 0.06),
            new THREE.SphereGeometry(0.035, 6, 6),
            new THREE.ConeGeometry(0.035, 0.07, 5),
            new THREE.BoxGeometry(0.05, 0.08, 0.05),
            new THREE.SphereGeometry(0.03, 8, 8),
            new THREE.ConeGeometry(0.04, 0.06, 4),
            new THREE.BoxGeometry(0.07, 0.05, 0.06),
            new THREE.SphereGeometry(0.04, 6, 6),
            new THREE.ConeGeometry(0.03, 0.08, 6),
            new THREE.BoxGeometry(0.055, 0.055, 0.055)
        ];
        var partColors = [0x44aaff, 0xff6644, 0x44ff88, 0xffaa22, 0xaa44ff,
                          0xff44aa, 0x22ddff, 0xffdd44, 0x66ff66, 0xff8866];

        // Target grid positions (2 rows x 5 columns, centered beside model)
        this._targets = [];
        for (var row = 0; row < 2; row++) {
            for (var col = 0; col < 5; col++) {
                this._targets.push({
                    x: ox - 0.5 + col * 0.11,
                    y: oy - 0.15 + row * 0.12
                });
            }
        }

        for (var i = 0; i < 10; i++) {
            var mat = new THREE.MeshBasicMaterial({
                color: partColors[i], transparent: true, opacity: 0.8,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var mesh = new THREE.Mesh(geos[i], mat);
            // Random scattered start positions
            var startX = ox + (Math.random() - 0.5) * 2.5;
            var startY = oy + (Math.random() - 0.5) * 1.8;
            mesh.position.set(startX, startY, (Math.random() - 0.5) * 0.3);
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            scene.add(mesh);
            this._parts.push({
                mesh: mesh,
                startX: startX,
                startY: startY,
                startZ: mesh.position.z,
                startRx: mesh.rotation.x,
                startRy: mesh.rotation.y,
                startRz: mesh.rotation.z,
                targetX: this._targets[i].x,
                targetY: this._targets[i].y,
                snapped: false,
                snapTime: 0
            });
        }

        // Snap spark particles
        this._sparks = [];
        var spkGeo = new THREE.SphereGeometry(0.012, 4, 4);
        for (var j = 0; j < 15; j++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spk = new THREE.Mesh(spkGeo, sMat);
            spk.visible = false;
            scene.add(spk);
            this._sparks.push({ mesh: spk, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._spkIdx = 0;

        // Satisfaction glow (green)
        var satGeo = new THREE.SphereGeometry(0.4, 12, 12);
        var satMat = new THREE.MeshBasicMaterial({
            color: 0x44ff88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._satGlow = new THREE.Mesh(satGeo, satMat);
        this._satGlow.position.set(ox - 0.25, oy - 0.09, 0);
        scene.add(this._satGlow);

        this._snapOrder = [3, 7, 1, 9, 5, 0, 4, 8, 2, 6]; // shuffled snap order
    },
    _burstSpark(x, y) {
        for (var i = 0; i < 3; i++) {
            var s = this._sparks[this._spkIdx % this._sparks.length];
            this._spkIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x, y, 0);
            var a = Math.random() * Math.PI * 2;
            var spd = 1.5 + Math.random() * 2.0;
            s.vx = Math.cos(a) * spd;
            s.vy = Math.sin(a) * spd;
            s.vz = (Math.random() - 0.5) * 1.0;
            s.life = 0.2 + Math.random() * 0.2;
            s.maxLife = s.life;
            s.mesh.material.opacity = 1.0;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;

        if (progress < 0.08) {
            // Phase 1: Parts scattered, drifting randomly
            var t = progress / 0.08;
            for (var i = 0; i < this._parts.length; i++) {
                var p = this._parts[i];
                p.mesh.position.x = p.startX + Math.sin(time * 1.5 + i) * 0.05;
                p.mesh.position.y = p.startY + Math.cos(time * 1.3 + i * 0.7) * 0.05;
                p.mesh.rotation.x += delta * (0.5 + i * 0.1);
                p.mesh.rotation.z += delta * (0.3 + i * 0.15);
                p.mesh.material.opacity = t * 0.8;
            }
        } else if (progress < 0.30) {
            // Phase 2: Parts begin drifting toward their target positions
            var t2 = (progress - 0.08) / 0.22;
            for (var j = 0; j < this._parts.length; j++) {
                var p2 = this._parts[j];
                if (p2.snapped) continue;
                var drift = t2 * t2 * 0.5; // slow start
                p2.mesh.position.x = p2.startX + (p2.targetX - p2.startX) * drift + Math.sin(time * 2 + j) * 0.03 * (1 - drift);
                p2.mesh.position.y = p2.startY + (p2.targetY - p2.startY) * drift + Math.cos(time * 1.8 + j) * 0.03 * (1 - drift);
                p2.mesh.position.z = p2.startZ * (1 - drift);
                p2.mesh.rotation.x = p2.startRx * (1 - drift);
                p2.mesh.rotation.y = p2.startRy * (1 - drift);
                p2.mesh.rotation.z = p2.startRz * (1 - drift);
            }
            // Model leans to watch
            model.rotation.z = Math.sin(time * 1.5) * 0.04;
        } else if (progress < 0.65) {
            // Phase 3: Accelerating assembly, snaps with sparks
            var t3 = (progress - 0.30) / 0.35;
            var snapCount = Math.floor(t3 * 10);

            for (var k = 0; k < this._parts.length; k++) {
                var p3 = this._parts[k];
                // Find this part's snap index
                var snapIdx = -1;
                for (var si = 0; si < this._snapOrder.length; si++) {
                    if (this._snapOrder[si] === k) { snapIdx = si; break; }
                }

                if (snapIdx < snapCount) {
                    // Snapped into place
                    if (!p3.snapped) {
                        p3.snapped = true;
                        p3.snapTime = time;
                        this._burstSpark(p3.targetX, p3.targetY);
                    }
                    p3.mesh.position.set(p3.targetX, p3.targetY, 0);
                    p3.mesh.rotation.set(0, 0, 0);
                    // Tiny bounce on snap
                    var sincSnap = time - p3.snapTime;
                    if (sincSnap < 0.15) {
                        var bounce = Math.sin(sincSnap / 0.15 * Math.PI) * 0.02;
                        p3.mesh.position.y += bounce;
                    }
                } else {
                    // Still drifting, closer now
                    var localT = (t3 * 10 - snapIdx) / 1.0;
                    if (localT < 0) localT = 0;
                    if (localT > 1) localT = 1;
                    var ease = localT * localT * localT;
                    p3.mesh.position.x = p3.startX + (p3.targetX - p3.startX) * (0.5 + ease * 0.5);
                    p3.mesh.position.y = p3.startY + (p3.targetY - p3.startY) * (0.5 + ease * 0.5);
                    p3.mesh.position.z = p3.startZ * (1 - ease) * 0.3;
                    p3.mesh.rotation.x = p3.startRx * (1 - ease) * 0.2;
                    p3.mesh.rotation.y = p3.startRy * (1 - ease) * 0.2;
                    p3.mesh.rotation.z = p3.startRz * (1 - ease) * 0.2;
                }
            }
            model.rotation.z = Math.sin(time * 2) * 0.03;
        } else if (progress < 0.80) {
            // Phase 4: Final pieces snap in
            var t4 = (progress - 0.65) / 0.15;
            for (var m = 0; m < this._parts.length; m++) {
                var p4 = this._parts[m];
                if (!p4.snapped) {
                    p4.snapped = true;
                    p4.snapTime = time;
                    this._burstSpark(p4.targetX, p4.targetY);
                }
                p4.mesh.position.set(p4.targetX, p4.targetY, 0);
                p4.mesh.rotation.set(0, 0, 0);
            }
            // Structure pulses
            var pulse = Math.sin(t4 * Math.PI * 3) * 0.02;
            for (var n = 0; n < this._parts.length; n++) {
                this._parts[n].mesh.position.y += pulse;
            }
            this._satGlow.material.opacity = t4 * 0.3;
            this._satGlow.scale.setScalar(1.0 + t4 * 0.3);
            model.rotation.z = 0;
        } else if (progress < 0.90) {
            // Phase 5: Assembled structure pulses neatly
            var t5 = (progress - 0.80) / 0.10;
            var neatPulse = Math.sin(t5 * Math.PI * 4) * 0.01;
            for (var q = 0; q < this._parts.length; q++) {
                this._parts[q].mesh.position.y = this._parts[q].targetY + neatPulse;
            }
            this._satGlow.material.opacity = 0.3 + Math.sin(t5 * Math.PI * 2) * 0.1;
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.90) / 0.10;
            for (var r = 0; r < this._parts.length; r++) {
                this._parts[r].mesh.material.opacity = 0.8 * (1 - t6);
            }
            this._satGlow.material.opacity = 0.3 * (1 - t6);
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update sparks
        for (var si2 = 0; si2 < this._sparks.length; si2++) {
            var sp = this._sparks[si2];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.mesh.position.z += sp.vz * delta;
            sp.vy -= 3.0 * delta;
            sp.mesh.material.opacity = sp.life / sp.maxLife;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._parts) { this._parts.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        if (this._sparks) { this._sparks.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._satGlow) { scene.remove(this._satGlow); this._satGlow.geometry.dispose(); this._satGlow.material.dispose(); }
        this._parts = this._sparks = this._satGlow = null;
    }
};
