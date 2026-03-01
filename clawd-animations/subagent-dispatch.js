import { cloneWithMaterials, setCloneOpacity, disposeClone } from './helpers.js';

export default {
    name: 'Subagent Dispatch',
    label: 'delegating',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        this._bigScale = this._origScale.x * 1.4; // boss grows bigger

        // Subagent clones
        this._subCount = 5;
        this._subs = [];
        this._subGroup = new THREE.Group();
        scene.add(this._subGroup);

        // Each subagent has: a clone, a task position, and a status line
        var taskPositions = [
            { x: -1.8, y: 0.5 },
            { x: -1.5, y: -0.3 },
            { x: -0.8, y: 1.0 },
            { x: -1.0, y: -0.8 },
            { x: -2.0, y: 0.0 }
        ];
        for (var i = 0; i < this._subCount; i++) {
            var clone = cloneWithMaterials(model);
            setCloneOpacity(clone, 0);
            clone.visible = false;
            clone.userData.taskX = taskPositions[i].x;
            clone.userData.taskY = taskPositions[i].y;
            clone.userData.spawnDelay = i * 0.12;
            clone.userData.workDuration = 1.5 + Math.random() * 1.5;
            clone.userData.phase = 'waiting'; // waiting, dispatched, working, returning, done
            clone.userData.phaseTime = 0;
            clone.userData.bobPhase = Math.random() * Math.PI * 2;
            this._subGroup.add(clone);
            this._subs.push(clone);
        }

        // Connection lines from boss to subagents
        this._lines = [];
        for (var j = 0; j < this._subCount; j++) {
            var lineGeo = new THREE.BufferGeometry();
            var positions = new Float32Array(6); // 2 points * 3 coords
            lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            var lineMat = new THREE.LineBasicMaterial({
                color: 0x66ccff, transparent: true, opacity: 0, linewidth: 2
            });
            var line = new THREE.Line(lineGeo, lineMat);
            line.visible = false;
            scene.add(line);
            this._lines.push(line);
        }

        // Task completion sparkles
        this._sparkles = [];
        var spkGeo = new THREE.SphereGeometry(0.025, 4, 4);
        for (var s = 0; s < 20; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: s % 3 === 0 ? 0x44ff44 : (s % 3 === 1 ? 0x44aaff : 0xffcc00),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spk = new THREE.Mesh(spkGeo, sMat);
            spk.visible = false;
            scene.add(spk);
            this._sparkles.push({ mesh: spk, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._spkIdx = 0;
        this._subScale = this._origScale.x * 0.3;
    },
    _spawnSparkle(x, y) {
        for (var i = 0; i < 3; i++) {
            var s = this._sparkles[this._spkIdx % this._sparkles.length];
            this._spkIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x, y, 0);
            var a = Math.random() * Math.PI * 2;
            var spd = 1.0 + Math.random() * 1.5;
            s.vx = Math.cos(a) * spd;
            s.vy = Math.sin(a) * spd;
            s.vz = (Math.random() - 0.5) * 0.5;
            s.life = 0.3 + Math.random() * 0.3;
            s.maxLife = s.life;
            s.mesh.material.opacity = 0.8;
            s.mesh.scale.setScalar(1);
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ss = this._subScale;

        if (progress < 0.1) {
            // Boss grows bigger, taking command
            var t = progress / 0.1;
            var growEase = 1 - Math.pow(1 - t, 3);
            var bossScale = this._origScale.x + (this._bigScale - this._origScale.x) * growEase;
            model.scale.setScalar(bossScale);
            model.position.x = orig.x - growEase * 0.2; // shift slightly left as grows
        } else if (progress < 0.3) {
            // Dispatch subagents one by one
            var t2 = (progress - 0.1) / 0.2;
            model.scale.setScalar(this._bigScale);
            model.position.x = orig.x - 0.2;

            for (var i = 0; i < this._subs.length; i++) {
                var sub = this._subs[i];
                var localT = Math.max(0, (t2 - sub.userData.spawnDelay) / (1 - sub.userData.spawnDelay));
                if (localT <= 0) continue;

                if (sub.userData.phase === 'waiting') {
                    sub.userData.phase = 'dispatched';
                    sub.userData.phaseTime = 0;
                    sub.visible = true;
                }

                var dispatchProgress = Math.min(localT * 2, 1);
                var ease = 1 - Math.pow(1 - dispatchProgress, 2);
                sub.position.set(
                    orig.x - 0.2 + (sub.userData.taskX - orig.x + 0.2) * ease,
                    orig.y + (sub.userData.taskY - orig.y) * ease,
                    0
                );
                setCloneOpacity(sub, Math.min(dispatchProgress * 2, 0.85));
                sub.scale.setScalar(ss * Math.min(dispatchProgress * 1.5, 1));

                // Show connection line
                this._lines[i].visible = true;
                var lp = this._lines[i].geometry.attributes.position.array;
                lp[0] = model.position.x; lp[1] = model.position.y + 0.3; lp[2] = 0;
                lp[3] = sub.position.x; lp[4] = sub.position.y; lp[5] = 0;
                this._lines[i].geometry.attributes.position.needsUpdate = true;
                this._lines[i].material.opacity = ease * 0.85;
            }
        } else if (progress < 0.7) {
            // Subagents working (bobbing, pulsing) then reporting back
            var t3 = (progress - 0.3) / 0.4;
            model.scale.setScalar(this._bigScale);
            model.position.x = orig.x - 0.2;

            for (var j = 0; j < this._subs.length; j++) {
                var sw = this._subs[j];
                var workEnd = sw.userData.workDuration / 3.0; // normalize to 0-1

                if (t3 < workEnd && sw.userData.phase !== 'done') {
                    // Working: bob and pulse
                    sw.userData.phase = 'working';
                    var bob = Math.sin(time * 4 + sw.userData.bobPhase) * 0.05;
                    var pulse = 1 + Math.sin(time * 6 + sw.userData.bobPhase) * 0.08;
                    sw.position.set(sw.userData.taskX, sw.userData.taskY + bob, 0);
                    sw.scale.setScalar(ss * pulse);
                    setCloneOpacity(sw, 0.85);
                    sw.visible = true;

                    // Connection line pulses
                    this._lines[j].visible = true;
                    var lp2 = this._lines[j].geometry.attributes.position.array;
                    lp2[0] = model.position.x; lp2[1] = model.position.y + 0.3; lp2[2] = 0;
                    lp2[3] = sw.position.x; lp2[4] = sw.position.y; lp2[5] = 0;
                    this._lines[j].geometry.attributes.position.needsUpdate = true;
                    this._lines[j].material.opacity = 0.65 + Math.sin(time * 3 + j) * 0.25;
                } else if (sw.userData.phase === 'working') {
                    // Task complete - return to boss
                    sw.userData.phase = 'returning';
                    sw.userData.phaseTime = 0;
                    this._spawnSparkle(sw.userData.taskX, sw.userData.taskY);
                }

                if (sw.userData.phase === 'returning') {
                    sw.userData.phaseTime += delta;
                    var retP = Math.min(sw.userData.phaseTime / 0.5, 1);
                    var retEase = retP * retP;
                    sw.position.set(
                        sw.userData.taskX + (model.position.x - sw.userData.taskX) * retEase,
                        sw.userData.taskY + (model.position.y - sw.userData.taskY) * retEase,
                        0
                    );
                    setCloneOpacity(sw, 0.85 * (1 - retP));
                    sw.scale.setScalar(ss * (1 - retP * 0.5));

                    // Line fades
                    this._lines[j].material.opacity = 0.7 * (1 - retP);
                    var lp3 = this._lines[j].geometry.attributes.position.array;
                    lp3[0] = model.position.x; lp3[1] = model.position.y + 0.3; lp3[2] = 0;
                    lp3[3] = sw.position.x; lp3[4] = sw.position.y; lp3[5] = 0;
                    this._lines[j].geometry.attributes.position.needsUpdate = true;

                    if (retP >= 1) {
                        sw.userData.phase = 'done';
                        sw.visible = false;
                        this._lines[j].visible = false;
                        // Boss pulses on absorb
                        model.scale.setScalar(this._bigScale * 1.05);
                    }
                }
            }

            // Boss scale settles
            var currentBossScale = model.scale.x;
            if (currentBossScale > this._bigScale) {
                model.scale.setScalar(currentBossScale - delta * 0.5);
            }
        } else if (progress < 0.85) {
            // All done, boss shrinks back
            var t4 = (progress - 0.7) / 0.15;
            var shrinkEase = t4 * t4;
            var bossS = this._bigScale + (this._origScale.x - this._bigScale) * shrinkEase;
            model.scale.setScalar(bossS);
            model.position.x = orig.x - 0.2 + 0.2 * shrinkEase;
            model.position.y = orig.y;

            // Hide remaining subs/lines
            for (var k = 0; k < this._subs.length; k++) {
                this._subs[k].visible = false;
                this._lines[k].visible = false;
            }
        } else {
            // Return to rest
            model.position.copy(orig);
            model.scale.copy(this._origScale);
            model.rotation.z = 0;
            for (var l = 0; l < this._subs.length; l++) {
                this._subs[l].visible = false;
                this._lines[l].visible = false;
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
            sp.vy -= 2 * delta;
            var lr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = 0.8 * lr;
            sp.mesh.scale.setScalar(lr);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._subs) {
            for (var i = 0; i < this._subs.length; i++) { disposeClone(this._subs[i]); }
        }
        if (this._subGroup) scene.remove(this._subGroup);
        if (this._lines) { this._lines.forEach(function(l) { scene.remove(l); l.geometry.dispose(); l.material.dispose(); }); }
        if (this._sparkles) { this._sparkles.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._subs = this._subGroup = this._lines = this._sparkles = null;
    }
};
