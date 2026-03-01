export default {
    name: 'Prompt Cache',
    label: 'caching',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Token blocks — small rounded cubes that emit from clawd
        this._tokens = [];
        this._tokenGroup = new THREE.Group();
        scene.add(this._tokenGroup);
        var tokenGeo = new THREE.BoxGeometry(0.08, 0.06, 0.04);
        var tokenColors = [0x44aaff, 0x66ccff, 0x88ddff, 0xaaeeff, 0x22ccaa,
                           0x44ddbb, 0x66eedd, 0x88ffee, 0xffcc44, 0xffdd66];
        for (var i = 0; i < 24; i++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: tokenColors[i % tokenColors.length],
                transparent: true, opacity: 0
            });
            var token = new THREE.Mesh(tokenGeo, tMat);
            token.visible = false;
            this._tokenGroup.add(token);
            // Grid target position for cache (left of model)
            var col = i % 6, row = Math.floor(i / 6);
            this._tokens.push({
                mesh: token,
                cacheX: this._origPos.x - 1.2 - col * 0.12,
                cacheY: this._origPos.y + 0.6 - row * 0.10,
                emitted: false, cached: false, replayed: false,
                emitTime: 0, delay: i * 0.06
            });
        }

        // Cache container outline
        var cacheW = 0.78, cacheH = 0.46;
        var cx = this._origPos.x - 1.2 - 2.5 * 0.12;
        var cy = this._origPos.y + 0.6 - 1.5 * 0.10;
        var cacheGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(cacheW, cacheH, 0.02));
        var cacheMat = new THREE.LineBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0 });
        this._cacheBox = new THREE.LineSegments(cacheGeo, cacheMat);
        this._cacheBox.position.set(cx, cy, 0);
        scene.add(this._cacheBox);

        // Cache hit glow
        var glowGeo = new THREE.BoxGeometry(cacheW + 0.1, cacheH + 0.1, 0.05);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffcc00, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._cacheGlow = new THREE.Mesh(glowGeo, glowMat);
        this._cacheGlow.position.set(cx, cy, -0.02);
        scene.add(this._cacheGlow);

        // "90% saved" sparkle particles
        this._sparks = [];
        var spkGeo = new THREE.SphereGeometry(0.02, 4, 4);
        for (var s = 0; s < 15; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: s % 2 === 0 ? 0xffdd00 : 0x44ff44,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spk = new THREE.Mesh(spkGeo, sMat);
            spk.visible = false;
            scene.add(spk);
            this._sparks.push({ mesh: spk, life: 0, maxLife: 0, vx: 0, vy: 0 });
        }
        this._spkIdx = 0;
    },
    _spawnSpark(x, y) {
        var s = this._sparks[this._spkIdx % this._sparks.length];
        this._spkIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x, y, 0.05);
        var a = Math.random() * Math.PI * 2;
        s.vx = Math.cos(a) * (0.5 + Math.random());
        s.vy = Math.sin(a) * (0.5 + Math.random());
        s.life = 0.4 + Math.random() * 0.3;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.9;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;

        if (progress < 0.05) {
            // Clawd leans forward, preparing to emit
            var t = progress / 0.05;
            model.rotation.z = t * 0.06;
        } else if (progress < 0.35) {
            // Emit tokens one by one from clawd to cache positions
            var t2 = (progress - 0.05) / 0.3;
            model.rotation.z = 0.06;
            // Pulse model slightly as emitting
            model.scale.setScalar(this._origScale.x * (1 + Math.sin(time * 8) * 0.03));

            for (var i = 0; i < this._tokens.length; i++) {
                var tk = this._tokens[i];
                var localT = Math.max(0, (t2 - tk.delay / 1.5) / (1 - tk.delay / 1.5));
                if (localT <= 0) continue;
                tk.mesh.visible = true;
                tk.emitted = true;
                var flyP = Math.min(localT * 1.5, 1);
                var ease = 1 - Math.pow(1 - flyP, 3);
                tk.mesh.position.set(
                    orig.x - 0.2 + (tk.cacheX - orig.x + 0.2) * ease,
                    orig.y + 0.3 + (tk.cacheY - orig.y - 0.3) * ease,
                    0
                );
                tk.mesh.material.opacity = Math.min(flyP * 2, 0.85);
                tk.mesh.scale.setScalar(0.5 + ease * 0.5);
                if (flyP >= 1) tk.cached = true;
            }

            // Show cache box outline
            this._cacheBox.material.opacity = t2 * 0.6;
        } else if (progress < 0.5) {
            // All cached, box solidifies
            var t3 = (progress - 0.35) / 0.15;
            model.rotation.z = 0.06 * (1 - t3);
            model.scale.copy(this._origScale);

            this._cacheBox.material.opacity = 0.6 + t3 * 0.2;
            for (var j = 0; j < this._tokens.length; j++) {
                var tk2 = this._tokens[j];
                tk2.mesh.position.set(tk2.cacheX, tk2.cacheY, 0);
                tk2.mesh.material.opacity = 0.85;
                tk2.mesh.scale.setScalar(1);
            }
        } else if (progress < 0.65) {
            // Cache hit! Golden glow pulses, tokens flash
            var t4 = (progress - 0.5) / 0.15;
            var hitPulse = Math.sin(t4 * Math.PI * 3) * 0.5 + 0.5;
            this._cacheGlow.material.opacity = hitPulse * 0.4;
            this._cacheBox.material.opacity = 0.8;
            this._cacheBox.material.color.set(t4 < 0.3 ? 0x44aaff : 0xffcc00);

            // Tokens flash gold
            for (var k = 0; k < this._tokens.length; k++) {
                var tk3 = this._tokens[k];
                if (t4 > 0.2) {
                    tk3.mesh.material.color.set(0xffdd44);
                }
                tk3.mesh.material.opacity = 0.85 + hitPulse * 0.15;
            }

            // Spawn sparkles
            if (Math.random() < 0.4) {
                this._spawnSpark(
                    this._cacheGlow.position.x + (Math.random() - 0.5) * 0.8,
                    this._cacheGlow.position.y + (Math.random() - 0.5) * 0.4
                );
            }

            // Model reacts excitedly
            model.position.y = orig.y + Math.abs(Math.sin(time * 6)) * 0.04;
        } else if (progress < 0.8) {
            // Tokens fly back to clawd at high speed (cache replay)
            var t5 = (progress - 0.65) / 0.15;
            this._cacheGlow.material.opacity = (1 - t5) * 0.3;
            this._cacheBox.material.opacity = (1 - t5) * 0.8;

            for (var m = 0; m < this._tokens.length; m++) {
                var tk4 = this._tokens[m];
                var replayDelay = m * 0.02;
                var localR = Math.max(0, (t5 - replayDelay) / (1 - replayDelay));
                var rEase = localR * localR * localR; // fast cubic
                tk4.mesh.position.set(
                    tk4.cacheX + (orig.x - tk4.cacheX) * rEase,
                    tk4.cacheY + (orig.y + 0.2 - tk4.cacheY) * rEase,
                    0
                );
                tk4.mesh.material.opacity = 0.9 * (1 - localR);
                if (localR > 0.9) tk4.mesh.visible = false;
            }

            // Model absorbs tokens, pulses bigger
            var absorbed = t5 * t5;
            model.scale.setScalar(this._origScale.x * (1 + absorbed * 0.15));
            model.position.y = orig.y;
        } else {
            // Settle back
            var t6 = (progress - 0.8) / 0.2;
            var settle = 1 - Math.pow(1 - t6, 2);
            model.scale.setScalar(this._origScale.x * (1.15 - settle * 0.15));
            model.position.copy(orig);
            model.rotation.z = 0;
            this._cacheGlow.material.opacity = 0;
            this._cacheBox.material.opacity = 0;
            for (var n = 0; n < this._tokens.length; n++) {
                this._tokens[n].mesh.visible = false;
            }
        }

        // Update sparkles
        for (var si = 0; si < this._sparks.length; si++) {
            var sp = this._sparks[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            var lr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = 0.9 * lr;
            sp.mesh.scale.setScalar(0.5 + 0.5 * lr);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._tokenGroup) {
            this._tokenGroup.traverse(function(child) {
                if (child.isMesh) { child.geometry.dispose(); child.material.dispose(); }
            });
            scene.remove(this._tokenGroup);
        }
        if (this._cacheBox) { scene.remove(this._cacheBox); this._cacheBox.geometry.dispose(); this._cacheBox.material.dispose(); }
        if (this._cacheGlow) { scene.remove(this._cacheGlow); this._cacheGlow.geometry.dispose(); this._cacheGlow.material.dispose(); }
        if (this._sparks) { this._sparks.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._tokens = this._tokenGroup = this._cacheBox = this._cacheGlow = this._sparks = null;
    }
};
