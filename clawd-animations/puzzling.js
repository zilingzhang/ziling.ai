export default {
    name: 'Puzzling',
    label: 'puzzling',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // 10 puzzle pieces (varied flat shapes - boxes with different proportions)
        this._pieces = [];
        var pieceShapes = [
            { w: 0.06, h: 0.06 }, { w: 0.07, h: 0.05 }, { w: 0.05, h: 0.07 },
            { w: 0.06, h: 0.05 }, { w: 0.05, h: 0.06 }, { w: 0.07, h: 0.06 },
            { w: 0.06, h: 0.07 }, { w: 0.05, h: 0.05 }, { w: 0.07, h: 0.07 },
            { w: 0.06, h: 0.06 }
        ];
        var pieceColors = [0xff6644, 0x44aaff, 0x66dd44, 0xffaa44, 0xaa44ff,
                           0x44ffaa, 0xff44aa, 0xdddd44, 0x44ddff, 0xff8866];

        // Target positions (assembled puzzle layout)
        var targetPositions = [
            { x: -0.1, y: 0.2 }, { x: 0, y: 0.2 }, { x: 0.1, y: 0.2 },
            { x: -0.1, y: 0.1 }, { x: 0, y: 0.1 }, { x: 0.1, y: 0.1 },
            { x: -0.1, y: 0 }, { x: 0, y: 0 }, { x: 0.1, y: 0 },
            { x: 0, y: -0.1 }
        ];

        for (var i = 0; i < 10; i++) {
            var pGeo = new THREE.BoxGeometry(pieceShapes[i].w, pieceShapes[i].h, 0.01);
            var pMat = new THREE.MeshBasicMaterial({
                color: pieceColors[i],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
                side: THREE.DoubleSide
            });
            var piece = new THREE.Mesh(pGeo, pMat);
            piece.visible = false;
            scene.add(piece);

            var scramAngle = Math.random() * Math.PI * 2;
            var scramDist = 0.25 + Math.random() * 0.2;
            this._pieces.push({
                mesh: piece,
                scrambledX: ox + Math.cos(scramAngle) * scramDist,
                scrambledY: oy + 0.1 + Math.sin(scramAngle) * scramDist * 0.6,
                scrambledRot: (Math.random() - 0.5) * Math.PI * 2,
                targetX: ox + targetPositions[i].x,
                targetY: oy + 0.1 + targetPositions[i].y,
                placed: false,
                placeTime: 0.25 + i * 0.06,
                searching: false,
                searchPhase: Math.random() * Math.PI * 2
            });
        }

        // Snap flash particles
        this._snapParticles = [];
        var snapGeo = new THREE.SphereGeometry(0.012, 5, 5);
        for (var s = 0; s < 15; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: s % 2 === 0 ? 0xffffff : 0xffeeaa,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var snap = new THREE.Mesh(snapGeo, sMat);
            snap.visible = false;
            scene.add(snap);
            this._snapParticles.push({
                mesh: snap,
                life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._snapIdx = 0;

        // Completion glow
        var compGeo = new THREE.SphereGeometry(0.35, 12, 12);
        var compMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._completionGlow = new THREE.Mesh(compGeo, compMat);
        this._completionGlow.position.set(ox, oy + 0.1, -0.03);
        scene.add(this._completionGlow);

        this._placedCount = 0;
    },
    _spawnSnap(x, y) {
        for (var i = 0; i < 3; i++) {
            var p = this._snapParticles[this._snapIdx % this._snapParticles.length];
            this._snapIdx++;
            p.mesh.visible = true;
            p.mesh.position.set(x, y, 0.03);
            var a = Math.random() * Math.PI * 2;
            var spd = 0.3 + Math.random() * 0.4;
            p.vx = Math.cos(a) * spd;
            p.vy = Math.sin(a) * spd;
            p.life = 0.2 + Math.random() * 0.2;
            p.maxLife = p.life;
            p.mesh.material.opacity = 0.8;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.08) {
            // Phase 1: Pieces appear jumbled
            var t = progress / 0.08;
            for (var i = 0; i < 10; i++) {
                this._pieces[i].mesh.visible = true;
                this._pieces[i].mesh.material.opacity = t * 0.5;
                this._pieces[i].mesh.position.set(
                    this._pieces[i].scrambledX,
                    this._pieces[i].scrambledY,
                    0.02
                );
                this._pieces[i].mesh.rotation.z = this._pieces[i].scrambledRot;
            }
            model.position.set(ox, oy, oz);
        } else if (progress < 0.65) {
            // Phase 2: Pieces try to fit, some snap together
            var t2 = (progress - 0.08) / 0.57;

            for (var j = 0; j < 10; j++) {
                var piece = this._pieces[j];
                if (t2 > piece.placeTime && !piece.placed) {
                    // Place this piece
                    piece.placed = true;
                    this._placedCount++;
                    this._spawnSnap(piece.targetX, piece.targetY);
                }

                if (piece.placed) {
                    // Move toward target
                    var placeProg = Math.min(1, (t2 - piece.placeTime) * 5);
                    var ease = 1 - Math.pow(1 - placeProg, 3);
                    piece.mesh.position.x += (piece.targetX - piece.mesh.position.x) * ease * 0.15;
                    piece.mesh.position.y += (piece.targetY - piece.mesh.position.y) * ease * 0.15;
                    piece.mesh.rotation.z += (0 - piece.mesh.rotation.z) * ease * 0.15;
                    piece.mesh.material.opacity = 0.6 + ease * 0.2;
                } else {
                    // Searching - rotate and wobble
                    piece.searchPhase += delta * 2;
                    var searchX = piece.scrambledX + Math.sin(piece.searchPhase) * 0.02;
                    var searchY = piece.scrambledY + Math.cos(piece.searchPhase * 0.7) * 0.015;
                    piece.mesh.position.set(searchX, searchY, 0.02);
                    piece.mesh.rotation.z = piece.scrambledRot + Math.sin(time * 2 + j) * 0.3;
                    piece.mesh.material.opacity = 0.5 + Math.sin(time * 3 + j) * 0.1;

                    // Some resist (frustration wobble)
                    if (t2 > piece.placeTime - 0.05 && t2 < piece.placeTime) {
                        var wobble = Math.sin(time * 15) * 0.01;
                        piece.mesh.position.x += wobble;
                    }
                }
            }

            // Model tries fitting them
            model.position.set(
                ox + Math.sin(time * 1.5) * 0.008,
                oy + Math.sin(time * 1) * 0.004,
                oz
            );
            model.rotation.z = Math.sin(time * 1) * 0.02;
        } else if (progress < 0.80) {
            // Phase 3: All click into place, frustration then relief
            var t3 = (progress - 0.65) / 0.15;

            // Force remaining pieces into place
            for (var k = 0; k < 10; k++) {
                var pk = this._pieces[k];
                if (!pk.placed) {
                    pk.placed = true;
                    this._spawnSnap(pk.targetX, pk.targetY);
                }
                var snap = Math.min(1, (t3 + 0.3) * 2);
                pk.mesh.position.x += (pk.targetX - pk.mesh.position.x) * snap * 0.2;
                pk.mesh.position.y += (pk.targetY - pk.mesh.position.y) * snap * 0.2;
                pk.mesh.rotation.z += (0 - pk.mesh.rotation.z) * snap * 0.2;
                pk.mesh.material.opacity = 0.8;
            }

            // Completion glow builds
            this._completionGlow.material.opacity = t3 * 0.2;
            this._completionGlow.scale.setScalar(1 + t3 * 0.5);

            model.position.set(ox, oy + t3 * 0.005, oz);
            model.rotation.z = 0;
        } else if (progress < 0.90) {
            // Phase 4: Completion glow
            var t4 = (progress - 0.80) / 0.10;
            var glowPulse = Math.sin(t4 * Math.PI);
            this._completionGlow.material.opacity = 0.2 + glowPulse * 0.15;
            this._completionGlow.scale.setScalar(1.5 + glowPulse * 0.3);

            for (var l = 0; l < 10; l++) {
                this._pieces[l].mesh.material.opacity = 0.8 + Math.sin(time * 3 + l) * 0.1;
            }

            model.position.set(ox, oy + 0.005, oz);
        } else {
            // Phase 5: Fade out
            var t5 = (progress - 0.90) / 0.10;
            this._completionGlow.material.opacity = 0.2 * (1 - t5);

            for (var m = 0; m < 10; m++) {
                this._pieces[m].mesh.material.opacity = 0.8 * (1 - t5);
            }

            model.position.set(ox, oy + 0.005 * (1 - t5), oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update snap particles
        for (var si = 0; si < this._snapParticles.length; si++) {
            var sp = this._snapParticles[si];
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
        if (this._pieces) {
            this._pieces.forEach(function(p) {
                scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose();
            });
        }
        if (this._snapParticles) {
            this._snapParticles.forEach(function(s) {
                scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose();
            });
        }
        if (this._completionGlow) { scene.remove(this._completionGlow); this._completionGlow.geometry.dispose(); this._completionGlow.material.dispose(); }
        this._pieces = this._snapParticles = this._completionGlow = null;
    }
};
