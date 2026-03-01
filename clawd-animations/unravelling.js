export default {
    name: 'Unravelling',
    label: 'unravelling',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Tangled ball (messy sphere of line segments)
        this._tangleLines = [];
        var lineGeo = new THREE.BoxGeometry(0.12, 0.006, 0.006);
        for (var i = 0; i < 25; i++) {
            var lMat = new THREE.MeshBasicMaterial({
                color: i % 4 === 0 ? 0x6644aa : (i % 4 === 1 ? 0x8866cc : (i % 4 === 2 ? 0xaa88ee : 0x5533aa)),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var line = new THREE.Mesh(lineGeo, lMat);
            // Random orientation within sphere
            var tangleAngle = Math.random() * Math.PI * 2;
            var tanglePhi = Math.random() * Math.PI;
            var tangleR = Math.random() * 0.12;
            line.position.set(
                ox - 0.3 + Math.sin(tanglePhi) * Math.cos(tangleAngle) * tangleR,
                oy + 0.1 + Math.sin(tanglePhi) * Math.sin(tangleAngle) * tangleR,
                Math.cos(tanglePhi) * tangleR * 0.3
            );
            line.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            scene.add(line);
            this._tangleLines.push({
                mesh: line,
                origRotX: line.rotation.x,
                origRotY: line.rotation.y,
                origRotZ: line.rotation.z,
                origPosX: line.position.x,
                origPosY: line.position.y,
                dissolved: false
            });
        }

        // Tangle outer glow
        var tangleGlowGeo = new THREE.SphereGeometry(0.18, 10, 10);
        var tangleGlowMat = new THREE.MeshBasicMaterial({
            color: 0x6644aa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._tangleGlow = new THREE.Mesh(tangleGlowGeo, tangleGlowMat);
        this._tangleGlow.position.set(ox - 0.3, oy + 0.1, 0);
        scene.add(this._tangleGlow);

        // Unwound thread path (series of small spheres tracing a path)
        this._threadPath = [];
        var threadGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var j = 0; j < 40; j++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: j % 2 === 0 ? 0xaa88ee : 0x8866cc,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var thread = new THREE.Mesh(threadGeo, tMat);
            thread.visible = false;
            scene.add(thread);
            this._threadPath.push({ mesh: thread, t: j / 40 });
        }

        // Maze/pattern path points (thread traces through)
        this._mazePath = [];
        var mazePoints = 40;
        for (var m = 0; m < mazePoints; m++) {
            var mT = m / mazePoints;
            // Create a winding path
            var px = ox - 0.3 + mT * 0.8;
            var py = oy + Math.sin(mT * Math.PI * 4) * 0.12 + Math.cos(mT * Math.PI * 2.5) * 0.08;
            this._mazePath.push({ x: px, y: py });
        }

        // Mystery solved glow
        var solvedGeo = new THREE.SphereGeometry(0.3, 12, 12);
        var solvedMat = new THREE.MeshBasicMaterial({
            color: 0xaa88ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._solvedGlow = new THREE.Mesh(solvedGeo, solvedMat);
        this._solvedGlow.position.set(ox + 0.2, oy, 0);
        scene.add(this._solvedGlow);

        // Clean organized result (small neat grid)
        this._resultParts = [];
        var resGeo = new THREE.BoxGeometry(0.03, 0.03, 0.01);
        for (var r = 0; r < 9; r++) {
            var rMat = new THREE.MeshBasicMaterial({
                color: r % 3 === 0 ? 0xaa88ff : (r % 3 === 1 ? 0x8866dd : 0xcc99ff),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var res = new THREE.Mesh(resGeo, rMat);
            var row = Math.floor(r / 3);
            var col = r % 3;
            res.position.set(
                ox + 0.35 + col * 0.04,
                oy + 0.04 - row * 0.04,
                0.02
            );
            res.visible = false;
            scene.add(res);
            this._resultParts.push(res);
        }

        this._unravelProgress = 0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.08) {
            // Phase 1: Tangled ball appears
            var t = progress / 0.08;
            for (var i = 0; i < this._tangleLines.length; i++) {
                this._tangleLines[i].mesh.material.opacity = t * 0.5;
            }
            this._tangleGlow.material.opacity = t * 0.15;
            model.position.set(ox + 0.1, oy, oz);
        } else if (progress < 0.20) {
            // Phase 2: Model pulls an end
            var t2 = (progress - 0.08) / 0.12;

            // Model reaches toward tangle
            model.position.set(ox + 0.1 - t2 * 0.2, oy, oz);
            model.rotation.z = -t2 * 0.1;

            // Tangle jiggles
            for (var j = 0; j < this._tangleLines.length; j++) {
                var tl = this._tangleLines[j];
                tl.mesh.rotation.x = tl.origRotX + Math.sin(time * 5 + j) * t2 * 0.2;
                tl.mesh.rotation.y = tl.origRotY + Math.cos(time * 4 + j) * t2 * 0.2;
            }

            this._tangleGlow.material.opacity = 0.15 + t2 * 0.05;
        } else if (progress < 0.70) {
            // Phase 3: Thread unwinds, traces maze path, tangle shrinks
            var t3 = (progress - 0.20) / 0.50;
            this._unravelProgress = t3;

            // Model pulls back
            model.position.set(ox - 0.1 + t3 * 0.2, oy + Math.sin(time * 2) * 0.01, oz);
            model.rotation.z = Math.sin(time * 3) * 0.03;

            // Tangle shrinks
            var tangleScale = 1 - t3 * 0.8;
            for (var k = 0; k < this._tangleLines.length; k++) {
                var tl2 = this._tangleLines[k];
                var dissolveT = t3 * this._tangleLines.length;
                if (k < dissolveT && !tl2.dissolved) {
                    tl2.dissolved = true;
                }
                if (tl2.dissolved) {
                    tl2.mesh.material.opacity *= 0.97;
                    tl2.mesh.scale.setScalar(Math.max(0.01, tl2.mesh.scale.x * 0.99));
                } else {
                    tl2.mesh.material.opacity = 0.5;
                    // Compress toward center
                    tl2.mesh.position.x = tl2.origPosX * tangleScale + ox * (1 - tangleScale) - 0.3 * (1 - tangleScale);
                    tl2.mesh.position.y = tl2.origPosY * tangleScale + (oy + 0.1) * (1 - tangleScale);
                    tl2.mesh.rotation.x = tl2.origRotX + Math.sin(time * 3 + k) * 0.1;
                }
            }

            this._tangleGlow.material.opacity = 0.2 * (1 - t3);
            this._tangleGlow.scale.setScalar(1 - t3 * 0.7);

            // Thread path traces through maze
            var pathReveal = Math.floor(t3 * 40);
            for (var pi = 0; pi < this._threadPath.length; pi++) {
                var tp = this._threadPath[pi];
                if (pi < pathReveal) {
                    tp.mesh.visible = true;
                    var mPoint = this._mazePath[pi];
                    tp.mesh.position.set(mPoint.x, mPoint.y, 0.01);
                    tp.mesh.material.opacity = 0.6;
                    // Pulse effect on recently revealed
                    if (pi > pathReveal - 3) {
                        tp.mesh.material.opacity = 0.8;
                        tp.mesh.scale.setScalar(1.5);
                    } else {
                        tp.mesh.scale.setScalar(1);
                    }
                }
            }
        } else if (progress < 0.85) {
            // Phase 4: Clean result, mystery solved
            var t4 = (progress - 0.70) / 0.15;

            // All thread path visible
            for (var tp2 = 0; tp2 < this._threadPath.length; tp2++) {
                this._threadPath[tp2].mesh.visible = true;
                this._threadPath[tp2].mesh.material.opacity = 0.6 * (1 - t4 * 0.3);
                this._threadPath[tp2].mesh.scale.setScalar(1);
            }

            // Tangle gone
            for (var tl3 = 0; tl3 < this._tangleLines.length; tl3++) {
                this._tangleLines[tl3].mesh.material.opacity *= 0.9;
            }
            this._tangleGlow.material.opacity = 0;

            // Clean result appears
            for (var ri = 0; ri < this._resultParts.length; ri++) {
                var resDelay = ri * 0.05;
                var resT = Math.max(0, t4 - resDelay) / (1 - resDelay);
                this._resultParts[ri].visible = resT > 0;
                this._resultParts[ri].material.opacity = resT * 0.7;
            }

            // Mystery solved glow
            var solvedEase = Math.sin(t4 * Math.PI);
            this._solvedGlow.material.opacity = solvedEase * 0.25;
            this._solvedGlow.scale.setScalar(1 + solvedEase * 0.5);

            model.position.set(ox + 0.1, oy, oz);
            model.rotation.z = 0;
        } else {
            // Phase 5: Settle
            var t5 = (progress - 0.85) / 0.15;
            for (var fp = 0; fp < this._threadPath.length; fp++) {
                this._threadPath[fp].mesh.material.opacity = 0.4 * (1 - t5);
            }
            for (var fr = 0; fr < this._resultParts.length; fr++) {
                this._resultParts[fr].material.opacity = 0.7 * (1 - t5);
            }
            this._solvedGlow.material.opacity = 0.25 * (1 - t5);

            model.position.set(ox + 0.1 * (1 - t5), oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._tangleLines) { this._tangleLines.forEach(function(l) { scene.remove(l.mesh); l.mesh.geometry.dispose(); l.mesh.material.dispose(); }); }
        if (this._tangleGlow) { scene.remove(this._tangleGlow); this._tangleGlow.geometry.dispose(); this._tangleGlow.material.dispose(); }
        if (this._threadPath) { this._threadPath.forEach(function(t) { scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); }); }
        if (this._solvedGlow) { scene.remove(this._solvedGlow); this._solvedGlow.geometry.dispose(); this._solvedGlow.material.dispose(); }
        if (this._resultParts) { this._resultParts.forEach(function(r) { scene.remove(r); r.geometry.dispose(); r.material.dispose(); }); }
        this._tangleLines = this._tangleGlow = this._threadPath = this._solvedGlow = this._resultParts = this._mazePath = null;
    }
};
