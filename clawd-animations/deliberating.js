export default {
    name: 'Deliberating',
    label: 'deliberating',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // 6 council ghost spheres in a circle around model
        this._council = [];
        var councilColors = [0x8888ff, 0x88aaff, 0xaa88ff, 0x88ffaa, 0xffaa88, 0xff88aa];
        for (var i = 0; i < 6; i++) {
            var cGeo = new THREE.SphereGeometry(0.06, 10, 10);
            var cMat = new THREE.MeshBasicMaterial({
                color: councilColors[i],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var cMesh = new THREE.Mesh(cGeo, cMat);
            cMesh.visible = false;
            scene.add(cMesh);

            var angle = (i / 6) * Math.PI * 2;
            var dist = 0.4;
            this._council.push({
                mesh: cMesh,
                angle: angle,
                dist: dist,
                baseX: ox + Math.cos(angle) * dist,
                baseY: oy + Math.sin(angle) * dist * 0.5,
                speaking: false,
                speakGlow: 0
            });
        }

        // Argument lines (colored lines between speakers)
        this._argLines = [];
        for (var a = 0; a < 8; a++) {
            var pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
            var argGeo = new THREE.BufferGeometry().setFromPoints(pts);
            var argMat = new THREE.LineBasicMaterial({
                color: a % 2 === 0 ? 0xffaa44 : 0x44aaff,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending
            });
            var argLine = new THREE.Line(argGeo, argMat);
            argLine.visible = false;
            scene.add(argLine);
            this._argLines.push({
                line: argLine,
                from: -1,
                to: -1,
                life: 0, maxLife: 0
            });
        }
        this._argIdx = 0;

        // Pulse glow spheres (one per council member, larger when speaking)
        this._pulseGlows = [];
        for (var p = 0; p < 6; p++) {
            var pgGeo = new THREE.SphereGeometry(0.12, 8, 8);
            var pgMat = new THREE.MeshBasicMaterial({
                color: councilColors[p],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
                side: THREE.BackSide
            });
            var pg = new THREE.Mesh(pgGeo, pgMat);
            pg.visible = false;
            scene.add(pg);
            this._pulseGlows.push({ mesh: pg });
        }

        // Consensus glow at center
        var consGeo = new THREE.SphereGeometry(0.5, 14, 14);
        var consMat = new THREE.MeshBasicMaterial({
            color: 0xaaccff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._consensusGlow = new THREE.Mesh(consGeo, consMat);
        this._consensusGlow.position.set(ox, oy, -0.05);
        scene.add(this._consensusGlow);

        this._currentSpeaker = 0;
        this._lastSpeakerChange = 0;
        this._lastArgSpawn = 0;
    },
    _spawnArgLine(fromIdx, toIdx) {
        var al = this._argLines[this._argIdx % this._argLines.length];
        this._argIdx++;
        al.from = fromIdx;
        al.to = toIdx;
        al.life = 0.8 + Math.random() * 0.5;
        al.maxLife = al.life;
        al.line.visible = true;
        al.line.material.opacity = 0.5;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.08) {
            // Phase 1: Council members appear one by one
            var t = progress / 0.08;
            for (var i = 0; i < 6; i++) {
                if (t > i * 0.15) {
                    var cf = Math.min(1, (t - i * 0.15) * 4);
                    this._council[i].mesh.visible = true;
                    this._council[i].mesh.material.opacity = cf * 0.4;
                    this._council[i].mesh.position.set(
                        this._council[i].baseX,
                        this._council[i].baseY + Math.sin(time * 1.5 + i) * 0.005,
                        0
                    );
                    this._pulseGlows[i].mesh.visible = true;
                    this._pulseGlows[i].mesh.position.copy(this._council[i].mesh.position);
                    this._pulseGlows[i].mesh.material.opacity = cf * 0.05;
                }
            }
            model.position.set(ox, oy, oz);
        } else if (progress < 0.35) {
            // Phase 2: Speakers take turns, model head turns
            var t2 = (progress - 0.08) / 0.27;

            // Cycle through speakers
            if (time - this._lastSpeakerChange > 1.2) {
                this._council[this._currentSpeaker].speaking = false;
                this._currentSpeaker = (this._currentSpeaker + 1) % 6;
                this._council[this._currentSpeaker].speaking = true;
                this._lastSpeakerChange = time;
            }

            for (var j = 0; j < 6; j++) {
                var cj = this._council[j];
                cj.mesh.position.set(
                    cj.baseX,
                    cj.baseY + Math.sin(time * 1.5 + j) * 0.008,
                    0
                );
                if (cj.speaking) {
                    cj.speakGlow = Math.min(1, cj.speakGlow + delta * 3);
                    cj.mesh.material.opacity = 0.5 + cj.speakGlow * 0.3;
                    cj.mesh.scale.setScalar(1 + cj.speakGlow * 0.3);
                    this._pulseGlows[j].mesh.material.opacity = cj.speakGlow * 0.15;
                    this._pulseGlows[j].mesh.scale.setScalar(1 + Math.sin(time * 6) * 0.2);
                } else {
                    cj.speakGlow = Math.max(0, cj.speakGlow - delta * 2);
                    cj.mesh.material.opacity = 0.4;
                    cj.mesh.scale.setScalar(1);
                    this._pulseGlows[j].mesh.material.opacity = 0.03;
                }
                this._pulseGlows[j].mesh.position.copy(cj.mesh.position);
            }

            // Model turns toward current speaker
            var speakerAngle = this._council[this._currentSpeaker].angle;
            var targetRot = Math.cos(speakerAngle) * 0.05;
            model.rotation.z += (targetRot - model.rotation.z) * 0.05;
            model.position.set(ox, oy + Math.sin(time * 1) * 0.003, oz);
        } else if (progress < 0.65) {
            // Phase 3: Heated debate, argument lines fly between speakers
            var t3 = (progress - 0.35) / 0.30;

            // Faster speaker changes
            if (time - this._lastSpeakerChange > 0.6) {
                this._council[this._currentSpeaker].speaking = false;
                this._currentSpeaker = (this._currentSpeaker + 1) % 6;
                this._council[this._currentSpeaker].speaking = true;
                this._lastSpeakerChange = time;

                // Spawn argument line
                var target = (this._currentSpeaker + 2 + Math.floor(Math.random() * 3)) % 6;
                this._spawnArgLine(this._currentSpeaker, target);
            }

            for (var k = 0; k < 6; k++) {
                var ck = this._council[k];
                ck.mesh.position.set(
                    ck.baseX + Math.sin(time * 3 + k * 2) * 0.01,
                    ck.baseY + Math.sin(time * 2 + k) * 0.01,
                    0
                );
                if (ck.speaking) {
                    ck.speakGlow = Math.min(1, ck.speakGlow + delta * 4);
                    ck.mesh.material.opacity = 0.5 + ck.speakGlow * 0.4;
                    ck.mesh.scale.setScalar(1 + Math.sin(time * 8) * 0.15);
                    this._pulseGlows[k].mesh.material.opacity = ck.speakGlow * 0.2;
                } else {
                    ck.speakGlow = Math.max(0, ck.speakGlow - delta * 3);
                    ck.mesh.material.opacity = 0.4 + Math.sin(time * 4 + k) * 0.05;
                    ck.mesh.scale.setScalar(1);
                    this._pulseGlows[k].mesh.material.opacity = 0.05;
                }
                this._pulseGlows[k].mesh.position.copy(ck.mesh.position);
            }

            var speakerAngle2 = this._council[this._currentSpeaker].angle;
            var targetRot2 = Math.cos(speakerAngle2) * 0.06;
            model.rotation.z += (targetRot2 - model.rotation.z) * 0.08;
            model.position.set(ox, oy + Math.sin(time * 1.5) * 0.005, oz);
        } else if (progress < 0.82) {
            // Phase 4: Discussion calming, moving toward consensus
            var t4 = (progress - 0.65) / 0.17;

            // All council members glow together
            for (var l = 0; l < 6; l++) {
                var cl = this._council[l];
                cl.speaking = false;
                cl.mesh.material.opacity = 0.5 + t4 * 0.2;
                cl.mesh.scale.setScalar(1 + Math.sin(time * 2) * 0.05);

                // Move slightly toward center
                var shrink = t4 * 0.15;
                cl.mesh.position.set(
                    cl.baseX + (ox - cl.baseX) * shrink,
                    cl.baseY + (oy - cl.baseY) * shrink + Math.sin(time * 1.5 + l) * 0.005,
                    0
                );
                this._pulseGlows[l].mesh.position.copy(cl.mesh.position);
                this._pulseGlows[l].mesh.material.opacity = 0.1 + t4 * 0.1;
            }

            this._consensusGlow.material.opacity = t4 * 0.15;
            this._consensusGlow.scale.setScalar(1 + t4 * 0.3);
            model.rotation.z = model.rotation.z * (1 - t4 * 0.5);
            model.position.set(ox, oy + 0.005, oz);
        } else {
            // Phase 5: Consensus glow, fade out
            var t5 = (progress - 0.82) / 0.18;
            this._consensusGlow.material.opacity = 0.15 * (1 - t5);
            this._consensusGlow.scale.setScalar(1.3 + t5 * 0.2);

            for (var m = 0; m < 6; m++) {
                this._council[m].mesh.material.opacity = 0.7 * (1 - t5);
                this._pulseGlows[m].mesh.material.opacity = 0.2 * (1 - t5);
            }

            model.position.set(ox, oy + 0.005 * (1 - t5), oz);
            model.rotation.z = model.rotation.z * (1 - t5 * 0.3);
            if (t5 > 0.9) {
                model.rotation.z = 0;
                model.scale.copy(this._origScale);
            }
        }

        // Update argument lines
        for (var ai = 0; ai < this._argLines.length; ai++) {
            var al = this._argLines[ai];
            if (al.life <= 0) continue;
            al.life -= delta;
            if (al.life <= 0) { al.line.visible = false; continue; }
            var lr = al.life / al.maxLife;
            al.line.material.opacity = lr * 0.5;
            if (al.from >= 0 && al.to >= 0) {
                var positions = al.line.geometry.attributes.position;
                positions.setXYZ(0, this._council[al.from].mesh.position.x, this._council[al.from].mesh.position.y, 0.02);
                positions.setXYZ(1, this._council[al.to].mesh.position.x, this._council[al.to].mesh.position.y, 0.02);
                positions.needsUpdate = true;
            }
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._council) {
            this._council.forEach(function(c) {
                scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose();
            });
        }
        if (this._pulseGlows) {
            this._pulseGlows.forEach(function(p) {
                scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose();
            });
        }
        if (this._argLines) {
            this._argLines.forEach(function(a) {
                scene.remove(a.line); a.line.geometry.dispose(); a.line.material.dispose();
            });
        }
        if (this._consensusGlow) { scene.remove(this._consensusGlow); this._consensusGlow.geometry.dispose(); this._consensusGlow.material.dispose(); }
        this._council = this._pulseGlows = this._argLines = this._consensusGlow = null;
    }
};
