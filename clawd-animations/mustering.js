export default {
    name: 'Mustering',
    label: 'mustering',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Scattered ally particles (dormant, dim)
        this._allies = [];
        var allyGeo = new THREE.SphereGeometry(0.025, 6, 6);
        for (var i = 0; i < 24; i++) {
            var aMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0x668833 : (i % 3 === 1 ? 0x88aa44 : 0xaacc55),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ally = new THREE.Mesh(allyGeo, aMat);
            // Scatter widely
            var scatterAngle = Math.random() * Math.PI * 2;
            var scatterDist = 0.4 + Math.random() * 0.5;
            var startX = ox + Math.cos(scatterAngle) * scatterDist;
            var startY = oy + Math.sin(scatterAngle) * scatterDist;
            ally.position.set(startX, startY, 0);
            ally.visible = false;
            scene.add(ally);
            this._allies.push({
                mesh: ally,
                startX: startX, startY: startY,
                activated: false,
                activateTime: 0,
                formX: 0, formY: 0,
                dimColor: aMat.color.clone(),
                phase: Math.random() * Math.PI * 2
            });
        }

        // Assign formation positions (3 rows of 8)
        for (var fi = 0; fi < this._allies.length; fi++) {
            var row = Math.floor(fi / 8);
            var col = fi % 8;
            this._allies[fi].formX = ox + (col - 3.5) * 0.08;
            this._allies[fi].formY = oy - 0.15 - row * 0.08;
        }

        // Rally call glow (from model raising arm)
        var rallyGeo = new THREE.SphereGeometry(0.15, 10, 10);
        var rallyMat = new THREE.MeshBasicMaterial({
            color: 0xccaa44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._rallyGlow = new THREE.Mesh(rallyGeo, rallyMat);
        this._rallyGlow.position.set(ox, oy + 0.15, 0);
        scene.add(this._rallyGlow);

        // Rally wave ring (expanding)
        var waveGeo = new THREE.TorusGeometry(0.1, 0.008, 6, 24);
        var waveMat = new THREE.MeshBasicMaterial({
            color: 0xffcc44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._rallyWave = new THREE.Mesh(waveGeo, waveMat);
        this._rallyWave.position.set(ox, oy, 0);
        scene.add(this._rallyWave);

        // Battle-ready pulse
        var pulseGeo = new THREE.SphereGeometry(0.5, 16, 16);
        var pulseMat = new THREE.MeshBasicMaterial({
            color: 0xccaa44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._readyPulse = new THREE.Mesh(pulseGeo, pulseMat);
        this._readyPulse.position.set(ox, oy - 0.1, 0);
        scene.add(this._readyPulse);

        // Activation sparkles
        this._sparkles = [];
        var spkGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var j = 0; j < 20; j++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: j % 2 === 0 ? 0xffdd44 : 0xaacc55,
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

        this._activatedCount = 0;
        this._waveRadius = 0;
    },
    _spawnSparkle(x, y) {
        var s = this._sparkles[this._spkIdx % this._sparkles.length];
        this._spkIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x, y, 0.02);
        var angle = Math.random() * Math.PI * 2;
        s.vx = Math.cos(angle) * 0.5;
        s.vy = Math.sin(angle) * 0.5;
        s.life = 0.3 + Math.random() * 0.2;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.8;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.08) {
            // Phase 1: Allies appear scattered, dormant
            var t = progress / 0.08;
            for (var i = 0; i < this._allies.length; i++) {
                var delay = i * 0.02;
                var ai = Math.max(0, (t - delay));
                this._allies[i].mesh.visible = ai > 0;
                this._allies[i].mesh.material.opacity = ai * 0.2;
            }
            model.position.set(ox, oy, oz);
        } else if (progress < 0.18) {
            // Phase 2: Model raises arm, rally call
            var t2 = (progress - 0.08) / 0.10;
            model.position.set(ox, oy + t2 * 0.05, oz);
            model.rotation.z = t2 * 0.1;

            // Rally glow
            this._rallyGlow.material.opacity = t2 * 0.4;
            this._rallyGlow.scale.setScalar(1 + t2 * 0.5);

            // Rally wave expands
            this._waveRadius = t2 * 0.3;
            this._rallyWave.material.opacity = t2 * 0.5;
            this._rallyWave.scale.setScalar(1 + t2 * 2);

            // Allies still dormant
            for (var j = 0; j < this._allies.length; j++) {
                this._allies[j].mesh.material.opacity = 0.2;
            }
        } else if (progress < 0.65) {
            // Phase 3: Allies activate one by one and move toward model
            var t3 = (progress - 0.18) / 0.47;

            // Rally wave continues expanding
            this._waveRadius = 0.3 + t3 * 0.8;
            this._rallyWave.scale.setScalar(1 + this._waveRadius * 5);
            this._rallyWave.material.opacity = Math.max(0, 0.5 - t3 * 0.4);

            this._rallyGlow.material.opacity = 0.4 - t3 * 0.2;
            this._rallyGlow.scale.setScalar(1.5 + Math.sin(time * 4) * 0.2);

            // Activate allies based on distance from center
            var activateRadius = this._waveRadius;
            for (var k = 0; k < this._allies.length; k++) {
                var ally = this._allies[k];
                var dx = ally.startX - ox;
                var dy = ally.startY - oy;
                var dist = Math.sqrt(dx * dx + dy * dy);

                if (!ally.activated && dist < activateRadius) {
                    ally.activated = true;
                    ally.activateTime = time;
                    this._activatedCount++;
                    this._spawnSparkle(ally.mesh.position.x, ally.mesh.position.y);
                }

                if (ally.activated) {
                    // Light up
                    ally.mesh.material.opacity = 0.6 + Math.sin(time * 5 + ally.phase) * 0.2;
                    ally.mesh.material.color.setHex(0xccaa44);
                    ally.mesh.scale.setScalar(1.2 + Math.sin(time * 4 + ally.phase) * 0.1);

                    // Move toward formation position
                    var moveT = Math.min((time - ally.activateTime) * 0.8, 1);
                    var easeT = moveT * moveT * (3 - 2 * moveT); // smoothstep
                    ally.mesh.position.x = ally.startX + (ally.formX - ally.startX) * easeT;
                    ally.mesh.position.y = ally.startY + (ally.formY - ally.startY) * easeT;
                } else {
                    ally.mesh.material.opacity = 0.2;
                    // Subtle drift while dormant
                    ally.mesh.position.x = ally.startX + Math.sin(time + ally.phase) * 0.01;
                    ally.mesh.position.y = ally.startY + Math.cos(time * 0.7 + ally.phase) * 0.01;
                }
            }

            model.position.set(ox, oy + 0.05, oz);
            model.rotation.z = 0.1 + Math.sin(time * 2) * 0.02;
        } else if (progress < 0.82) {
            // Phase 4: Formation assembles, ranks organize
            var t4 = (progress - 0.65) / 0.17;

            // All allies should be activated
            for (var m = 0; m < this._allies.length; m++) {
                var al = this._allies[m];
                if (!al.activated) {
                    al.activated = true;
                    al.activateTime = time;
                }
                al.mesh.material.opacity = 0.7 + Math.sin(time * 5 + al.phase) * 0.15;
                al.mesh.material.color.setHex(0xccaa44);

                // Tighten formation
                var formT = Math.min((time - al.activateTime) * 0.8, 1);
                al.mesh.position.x = al.startX + (al.formX - al.startX) * formT;
                al.mesh.position.y = al.startY + (al.formY - al.startY) * formT;
            }

            this._rallyWave.material.opacity = 0;
            this._rallyGlow.material.opacity = 0.2 * (1 - t4);

            model.position.set(ox, oy + 0.05, oz);
            model.rotation.z = 0.1 * (1 - t4);
        } else if (progress < 0.92) {
            // Phase 5: Battle-ready pulse
            var t5 = (progress - 0.82) / 0.10;
            var pulseEase = Math.sin(t5 * Math.PI);

            this._readyPulse.material.opacity = pulseEase * 0.25;
            this._readyPulse.scale.setScalar(1 + pulseEase * 0.5);

            // All allies flash in unison
            for (var n = 0; n < this._allies.length; n++) {
                this._allies[n].mesh.material.opacity = 0.7 + pulseEase * 0.3;
                this._allies[n].mesh.scale.setScalar(1.2 + pulseEase * 0.3);
            }

            model.position.set(ox, oy + 0.05, oz);
            model.rotation.z = 0;
        } else {
            // Phase 6: Settle
            var t6 = (progress - 0.92) / 0.08;
            for (var p = 0; p < this._allies.length; p++) {
                this._allies[p].mesh.material.opacity = 0.7 * (1 - t6);
            }
            this._readyPulse.material.opacity = 0.25 * (1 - t6);

            model.position.set(ox, oy + 0.05 * (1 - t6), oz);
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
            var lr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = lr * 0.7;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._allies) { this._allies.forEach(function(a) { scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose(); }); }
        if (this._rallyGlow) { scene.remove(this._rallyGlow); this._rallyGlow.geometry.dispose(); this._rallyGlow.material.dispose(); }
        if (this._rallyWave) { scene.remove(this._rallyWave); this._rallyWave.geometry.dispose(); this._rallyWave.material.dispose(); }
        if (this._readyPulse) { scene.remove(this._readyPulse); this._readyPulse.geometry.dispose(); this._readyPulse.material.dispose(); }
        if (this._sparkles) { this._sparkles.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._allies = this._rallyGlow = this._rallyWave = this._readyPulse = this._sparkles = null;
    }
};
