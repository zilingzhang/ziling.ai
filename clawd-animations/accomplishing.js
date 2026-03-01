export default {
    name: 'Accomplishing',
    label: 'accomplishing',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Task list: 5 checkbox items stacked vertically
        this._tasks = [];
        var boxGeo = new THREE.BoxGeometry(0.06, 0.06, 0.01);
        var checkGeo = new THREE.BoxGeometry(0.04, 0.015, 0.01);
        var lineGeo = new THREE.BoxGeometry(0.25, 0.015, 0.01);
        for (var i = 0; i < 5; i++) {
            var taskY = oy + 0.35 - i * 0.14;
            // Checkbox outline
            var cbMat = new THREE.MeshBasicMaterial({
                color: 0xccaa44, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var cb = new THREE.Mesh(boxGeo, cbMat);
            cb.position.set(ox - 0.55, taskY, 0.05);
            scene.add(cb);

            // Check mark (two small rotated bars)
            var chkMat = new THREE.MeshBasicMaterial({
                color: 0x44ff44, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var chk1 = new THREE.Mesh(checkGeo, chkMat);
            chk1.position.set(ox - 0.565, taskY - 0.01, 0.06);
            chk1.rotation.z = -0.7;
            scene.add(chk1);
            var chkMat2 = new THREE.MeshBasicMaterial({
                color: 0x44ff44, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var chk2 = new THREE.Mesh(checkGeo, chkMat2);
            chk2.position.set(ox - 0.54, taskY + 0.005, 0.06);
            chk2.rotation.z = 0.5;
            chk2.scale.x = 1.5;
            scene.add(chk2);

            // Task line (bar representing text)
            var lineMat = new THREE.MeshBasicMaterial({
                color: 0xddcc66, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var line = new THREE.Mesh(lineGeo, lineMat);
            line.position.set(ox - 0.35, taskY, 0.05);
            scene.add(line);

            this._tasks.push({
                cb: cb, chk1: chk1, chk2: chk2, line: line,
                completed: false, flashTime: 0
            });
        }

        // Progress bar background
        var barBgGeo = new THREE.BoxGeometry(0.5, 0.03, 0.01);
        var barBgMat = new THREE.MeshBasicMaterial({
            color: 0x333322, transparent: true, opacity: 0
        });
        this._barBg = new THREE.Mesh(barBgGeo, barBgMat);
        this._barBg.position.set(ox - 0.35, oy - 0.42, 0.05);
        scene.add(this._barBg);

        // Progress bar fill
        var barFillGeo = new THREE.BoxGeometry(0.5, 0.03, 0.01);
        var barFillMat = new THREE.MeshBasicMaterial({
            color: 0x44dd44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._barFill = new THREE.Mesh(barFillGeo, barFillMat);
        this._barFill.position.set(ox - 0.35, oy - 0.42, 0.06);
        this._barFill.scale.x = 0.01;
        scene.add(this._barFill);

        // Sparkle particles for completion
        this._sparkles = [];
        var spkGeo = new THREE.SphereGeometry(0.015, 4, 4);
        for (var j = 0; j < 30; j++) {
            var spkMat = new THREE.MeshBasicMaterial({
                color: j % 3 === 0 ? 0xffdd44 : (j % 3 === 1 ? 0x44ff44 : 0xffaa22),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spk = new THREE.Mesh(spkGeo, spkMat);
            spk.visible = false;
            scene.add(spk);
            this._sparkles.push({
                mesh: spk, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._spkIdx = 0;

        // Trophy glow (final burst)
        var trophyGeo = new THREE.SphereGeometry(0.15, 12, 12);
        var trophyMat = new THREE.MeshBasicMaterial({
            color: 0xffdd44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._trophy = new THREE.Mesh(trophyGeo, trophyMat);
        this._trophy.position.set(ox, oy, 0);
        scene.add(this._trophy);

        // Trophy cup shape (cylinder + cone)
        var cupGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.1, 8);
        var cupMat = new THREE.MeshBasicMaterial({
            color: 0xffcc00, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._cup = new THREE.Mesh(cupGeo, cupMat);
        this._cup.position.set(ox, oy + 0.45, 0.05);
        scene.add(this._cup);

        this._completedCount = 0;
    },
    _spawnSparkle(x, y, count) {
        for (var i = 0; i < count; i++) {
            var s = this._sparkles[this._spkIdx % this._sparkles.length];
            this._spkIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y, 0.07);
            var angle = Math.random() * Math.PI * 2;
            var speed = 0.5 + Math.random() * 1.0;
            s.vx = Math.cos(angle) * speed;
            s.vy = Math.sin(angle) * speed;
            s.life = 0.4 + Math.random() * 0.4;
            s.maxLife = s.life;
            s.mesh.material.opacity = 0.9;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.08) {
            // Phase 1: Task list fades in
            var t = progress / 0.08;
            for (var i = 0; i < this._tasks.length; i++) {
                var delay = i * 0.15;
                var ti = Math.max(0, t - delay);
                this._tasks[i].cb.material.opacity = ti * 0.7;
                this._tasks[i].line.material.opacity = ti * 0.5;
            }
            this._barBg.material.opacity = t * 0.3;
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.80) {
            // Phase 2: Model works through tasks
            var taskProgress = (progress - 0.08) / 0.72;
            var currentTask = Math.min(Math.floor(taskProgress * 5), 4);

            // Show all task boxes
            for (var j = 0; j < this._tasks.length; j++) {
                var task = this._tasks[j];
                task.cb.material.opacity = 0.7;
                task.line.material.opacity = 0.5;

                if (j < currentTask) {
                    // Completed tasks
                    task.chk1.material.opacity = 0.9;
                    task.chk2.material.opacity = 0.9;
                    task.line.material.color.setHex(0x88aa44);
                    task.line.material.opacity = 0.3;
                } else if (j === currentTask) {
                    // Current task: pulsing
                    var pulse = 0.6 + Math.sin(time * 8) * 0.2;
                    task.cb.material.opacity = pulse;
                    task.line.material.opacity = pulse * 0.7;

                    // Check if just completed
                    var taskLocalProg = (taskProgress * 5) - currentTask;
                    if (taskLocalProg > 0.7 && !task.completed) {
                        task.completed = true;
                        task.flashTime = time;
                        this._completedCount++;
                        this._spawnSparkle(task.cb.position.x, task.cb.position.y, 5);
                    }
                    if (task.completed) {
                        task.chk1.material.opacity = 0.9;
                        task.chk2.material.opacity = 0.9;
                    }
                }
            }

            // Progress bar fill
            this._barBg.material.opacity = 0.3;
            var fillAmt = Math.min(this._completedCount / 5, 1);
            this._barFill.scale.x = Math.max(0.01, fillAmt);
            this._barFill.material.opacity = 0.6;

            // Model bounces slightly at current task
            var taskCenterY = oy + 0.35 - currentTask * 0.14;
            model.position.set(
                ox + 0.15 + Math.sin(time * 6) * 0.01,
                taskCenterY + Math.sin(time * 4) * 0.01,
                oz
            );
            model.rotation.z = Math.sin(time * 5) * 0.03;
        } else if (progress < 0.90) {
            // Phase 3: Final task + trophy burst
            var t3 = (progress - 0.80) / 0.10;

            // Complete last task
            var lastTask = this._tasks[4];
            if (!lastTask.completed) {
                lastTask.completed = true;
                this._completedCount = 5;
                this._spawnSparkle(lastTask.cb.position.x, lastTask.cb.position.y, 8);
            }
            lastTask.chk1.material.opacity = 0.9;
            lastTask.chk2.material.opacity = 0.9;

            this._barFill.scale.x = 1;
            this._barFill.material.opacity = 0.8;

            // Trophy appears
            var trophyEase = Math.sin(t3 * Math.PI);
            this._trophy.material.opacity = trophyEase * 0.5;
            this._trophy.scale.setScalar(1 + trophyEase * 2);
            this._cup.material.opacity = t3 * 0.8;

            // Burst sparkles
            if (t3 < 0.3) {
                this._spawnSparkle(ox, oy + 0.45, 2);
            }

            model.position.set(ox, oy + t3 * 0.05, oz);
            model.rotation.z = 0;
        } else {
            // Phase 4: Fade out
            var t4 = (progress - 0.90) / 0.10;
            for (var k = 0; k < this._tasks.length; k++) {
                var tk = this._tasks[k];
                tk.cb.material.opacity = 0.7 * (1 - t4);
                tk.chk1.material.opacity = 0.9 * (1 - t4);
                tk.chk2.material.opacity = 0.9 * (1 - t4);
                tk.line.material.opacity = 0.3 * (1 - t4);
            }
            this._barBg.material.opacity = 0.3 * (1 - t4);
            this._barFill.material.opacity = 0.8 * (1 - t4);
            this._trophy.material.opacity = 0.5 * (1 - t4);
            this._cup.material.opacity = 0.8 * (1 - t4);

            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update sparkles
        for (var si = 0; si < this._sparkles.length; si++) {
            var sp = this._sparkles[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.vy -= 1.5 * delta;
            var lr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = lr * 0.8;
            sp.mesh.scale.setScalar(0.5 + lr * 0.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._tasks) {
            this._tasks.forEach(function(t) {
                scene.remove(t.cb); t.cb.geometry.dispose(); t.cb.material.dispose();
                scene.remove(t.chk1); t.chk1.geometry.dispose(); t.chk1.material.dispose();
                scene.remove(t.chk2); t.chk2.geometry.dispose(); t.chk2.material.dispose();
                scene.remove(t.line); t.line.geometry.dispose(); t.line.material.dispose();
            });
        }
        if (this._barBg) { scene.remove(this._barBg); this._barBg.geometry.dispose(); this._barBg.material.dispose(); }
        if (this._barFill) { scene.remove(this._barFill); this._barFill.geometry.dispose(); this._barFill.material.dispose(); }
        if (this._sparkles) {
            this._sparkles.forEach(function(s) {
                scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose();
            });
        }
        if (this._trophy) { scene.remove(this._trophy); this._trophy.geometry.dispose(); this._trophy.material.dispose(); }
        if (this._cup) { scene.remove(this._cup); this._cup.geometry.dispose(); this._cup.material.dispose(); }
        this._tasks = this._barBg = this._barFill = this._sparkles = this._trophy = this._cup = null;
    }
};
