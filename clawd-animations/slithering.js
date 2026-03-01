export default {
    name: 'Slithering',
    label: 'slithering',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // S-pattern trail particles
        this._trail = [];
        var trailGeo = new THREE.SphereGeometry(0.01, 6, 6);
        for (var i = 0; i < 30; i++) {
            var tColors = [0x44aa44, 0x66cc44, 0x88dd66, 0x33bb33, 0xaadd44];
            var tMat = new THREE.MeshBasicMaterial({
                color: tColors[i % tColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var trail = new THREE.Mesh(trailGeo, tMat);
            trail.visible = false;
            scene.add(trail);
            this._trail.push({ mesh: trail, age: 99 });
        }
        this._trailIdx = 0;

        // Friction sparks (subtle, at ground contact)
        this._sparks = [];
        var sparkGeo = new THREE.SphereGeometry(0.005, 4, 4);
        for (var j = 0; j < 15; j++) {
            var spColors = [0xffaa33, 0xff8822, 0xffcc44];
            var spMat = new THREE.MeshBasicMaterial({
                color: spColors[j % spColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spark = new THREE.Mesh(sparkGeo, spMat);
            spark.visible = false;
            scene.add(spark);
            this._sparks.push({ mesh: spark, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._sparkIdx = 0;

        // Scale shimmer (body surface glow that moves)
        this._scaleGlow = [];
        var glowGeo = new THREE.SphereGeometry(0.02, 6, 6);
        for (var k = 0; k < 6; k++) {
            var gColors = [0x44cc44, 0xddaa22, 0x44cc44, 0xddaa22, 0x44cc44, 0xddaa22];
            var gMat = new THREE.MeshBasicMaterial({
                color: gColors[k], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var glow = new THREE.Mesh(glowGeo, gMat);
            glow.visible = false;
            scene.add(glow);
            this._scaleGlow.push({ mesh: glow, offset: k * 0.3 });
        }

        // Forked tongue (two tiny lines, quick in-out)
        this._tongues = [];
        var tongueGeo = new THREE.BoxGeometry(0.04, 0.003, 0.002);
        for (var t = 0; t < 2; t++) {
            var tngMat = new THREE.MeshBasicMaterial({
                color: 0xff3333, transparent: true, opacity: 0,
                depthWrite: false
            });
            var tongue = new THREE.Mesh(tongueGeo, tngMat);
            tongue.visible = false;
            scene.add(tongue);
            this._tongues.push({ mesh: tongue });
        }

        // Hypnotic wave rings
        this._waveRings = [];
        var waveGeo = new THREE.RingGeometry(0.04, 0.05, 16);
        for (var w = 0; w < 4; w++) {
            var wMat = new THREE.MeshBasicMaterial({
                color: 0x44dd44, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            var wave = new THREE.Mesh(waveGeo, wMat);
            wave.visible = false;
            scene.add(wave);
            this._waveRings.push({ mesh: wave, life: 0, maxLife: 0, scale: 0 });
        }
        this._waveIdx = 0;

        this._lastTrail = 0;
        this._lastSpark = 0;
        this._lastWave = 0;
        this._tongueTimer = 0;
        this._tongueVisible = false;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        // S-curve movement parameters
        var slitherFreq = 3;
        var sineWave = Math.sin(time * slitherFreq);
        var cosWave = Math.cos(time * slitherFreq);

        if (progress < 0.06) {
            // Flatten posture, prepare to slither
            var t = progress / 0.06;
            model.position.set(orig.x, orig.y - t * 0.03, orig.z);
            model.scale.set(gs * (1 + t * 0.12), gs * (1 - t * 0.1), gs);
        } else if (progress < 0.40) {
            // Main slither: S-curve path moving right
            var t2 = (progress - 0.06) / 0.34;
            var pathX = orig.x - 0.3 + t2 * 0.8;
            var sineY = Math.sin(time * slitherFreq + t2 * Math.PI * 4) * 0.08;

            model.position.set(pathX, orig.y - 0.03 + sineY * 0.3, orig.z);

            // Body follows sine wave
            model.rotation.z = cosWave * 0.12;
            model.scale.set(gs * 1.12, gs * 0.9, gs);

            // Scale glow moves along body
            for (var gi = 0; gi < this._scaleGlow.length; gi++) {
                var sg = this._scaleGlow[gi];
                sg.mesh.visible = true;
                var sgPhase = time * 4 + sg.offset;
                var sgX = pathX + Math.sin(sgPhase) * 0.06;
                var sgY = orig.y + Math.cos(sgPhase) * 0.04;
                sg.mesh.position.set(sgX, sgY, 0.03);
                sg.mesh.material.opacity = 0.15 + Math.sin(sgPhase * 2) * 0.1;
            }

            // Trail in S-pattern
            if (time - this._lastTrail > 0.04) {
                var tr = this._trail[this._trailIdx % this._trail.length];
                this._trailIdx++;
                tr.mesh.visible = true;
                tr.mesh.position.set(pathX, orig.y - 0.03 + sineY * 0.3, 0);
                tr.age = 0;
                tr.mesh.material.opacity = 0.35;
                this._lastTrail = time;
            }

            // Subtle friction sparks
            if (time - this._lastSpark > 0.15) {
                var sp = this._sparks[this._sparkIdx % this._sparks.length];
                this._sparkIdx++;
                sp.mesh.visible = true;
                sp.mesh.position.set(pathX, orig.y - 0.18, 0);
                sp.vx = (Math.random() - 0.5) * 0.5;
                sp.vy = 0.2 + Math.random() * 0.3;
                sp.vz = (Math.random() - 0.5) * 0.1;
                sp.life = 0.15 + Math.random() * 0.1;
                sp.maxLife = sp.life;
                sp.mesh.material.opacity = 0.5;
                this._lastSpark = time;
            }

            // Hypnotic wave rings
            if (time - this._lastWave > 0.5) {
                var wr = this._waveRings[this._waveIdx % this._waveRings.length];
                this._waveIdx++;
                wr.mesh.visible = true;
                wr.mesh.position.set(pathX, orig.y, 0);
                wr.scale = 0.3;
                wr.life = 1.0;
                wr.maxLife = 1.0;
                wr.mesh.material.opacity = 0.3;
                this._lastWave = time;
            }
        } else if (progress < 0.48) {
            // Forked tongue flick!
            var t3 = (progress - 0.40) / 0.08;
            var tongueProgress = Math.sin(t3 * Math.PI);
            var stayX = orig.x + 0.5;

            model.position.set(stayX, orig.y - 0.03, orig.z);
            model.rotation.z = 0;
            model.scale.set(gs * 1.12, gs * 0.9, gs);

            // Tongue appears
            for (var ti = 0; ti < 2; ti++) {
                this._tongues[ti].mesh.visible = tongueProgress > 0.2;
                var tongueLen = tongueProgress * 0.04;
                var forkAngle = ti === 0 ? 0.15 : -0.15;
                this._tongues[ti].mesh.position.set(
                    stayX + 0.1 + tongueLen,
                    orig.y - 0.01 + forkAngle * tongueProgress * 0.3,
                    0.02
                );
                this._tongues[ti].mesh.rotation.z = forkAngle * tongueProgress;
                this._tongues[ti].mesh.material.opacity = tongueProgress * 0.8;
            }

            // Scale glow continues
            for (var gi2 = 0; gi2 < this._scaleGlow.length; gi2++) {
                var sg2 = this._scaleGlow[gi2];
                sg2.mesh.material.opacity = 0.15 + Math.sin(time * 4 + sg2.offset) * 0.08;
            }
        } else if (progress < 0.80) {
            // Slither back in S-curve
            var t4 = (progress - 0.48) / 0.32;
            var returnX = orig.x + 0.5 - t4 * 0.5;
            var returnSineY = Math.sin(time * slitherFreq + t4 * Math.PI * 4) * 0.08;

            model.position.set(returnX, orig.y - 0.03 + returnSineY * 0.3, orig.z);
            model.rotation.z = cosWave * 0.12;
            model.scale.set(gs * 1.12, gs * 0.9, gs);

            // Hide tongues
            for (var ti2 = 0; ti2 < 2; ti2++) {
                this._tongues[ti2].mesh.visible = false;
            }

            // Scale glow
            for (var gi3 = 0; gi3 < this._scaleGlow.length; gi3++) {
                var sg3 = this._scaleGlow[gi3];
                var sg3Phase = time * 4 + sg3.offset;
                sg3.mesh.position.set(
                    returnX + Math.sin(sg3Phase) * 0.06,
                    orig.y + Math.cos(sg3Phase) * 0.04,
                    0.03
                );
                sg3.mesh.material.opacity = 0.15 + Math.sin(sg3Phase * 2) * 0.08;
            }

            // Trail
            if (time - this._lastTrail > 0.04) {
                var tr2 = this._trail[this._trailIdx % this._trail.length];
                this._trailIdx++;
                tr2.mesh.visible = true;
                tr2.mesh.position.set(returnX, orig.y - 0.03 + returnSineY * 0.3, 0);
                tr2.age = 0;
                tr2.mesh.material.opacity = 0.3;
                this._lastTrail = time;
            }

            // Sparks
            if (time - this._lastSpark > 0.15) {
                var sp2 = this._sparks[this._sparkIdx % this._sparks.length];
                this._sparkIdx++;
                sp2.mesh.visible = true;
                sp2.mesh.position.set(returnX, orig.y - 0.18, 0);
                sp2.vx = (Math.random() - 0.5) * 0.4;
                sp2.vy = 0.15 + Math.random() * 0.25;
                sp2.vz = (Math.random() - 0.5) * 0.08;
                sp2.life = 0.15;
                sp2.maxLife = 0.15;
                sp2.mesh.material.opacity = 0.4;
                this._lastSpark = time;
            }
        } else {
            // Uncurl, return to normal
            var t5 = (progress - 0.80) / 0.20;
            model.position.set(orig.x, orig.y - 0.03 * (1 - t5), orig.z);
            model.rotation.z = 0;
            model.scale.set(
                gs * (1.12 - t5 * 0.12),
                gs * (0.9 + t5 * 0.1),
                gs
            );

            for (var gi4 = 0; gi4 < this._scaleGlow.length; gi4++) {
                this._scaleGlow[gi4].mesh.material.opacity = 0.15 * (1 - t5);
                if (t5 > 0.7) this._scaleGlow[gi4].mesh.visible = false;
            }

            if (t5 > 0.9) {
                model.position.copy(orig);
                model.scale.copy(this._origScale);
            }
        }

        // Update trail
        for (var tti = 0; tti < this._trail.length; tti++) {
            var tp = this._trail[tti];
            if (!tp.mesh.visible) continue;
            tp.age += delta;
            if (tp.age > 2.0) { tp.mesh.visible = false; continue; }
            tp.mesh.material.opacity = 0.35 * Math.max(0, 1 - tp.age / 2.0);
        }

        // Update sparks
        for (var si = 0; si < this._sparks.length; si++) {
            var sp3 = this._sparks[si];
            if (sp3.life <= 0) continue;
            sp3.life -= delta;
            if (sp3.life <= 0) { sp3.mesh.visible = false; continue; }
            sp3.mesh.position.x += sp3.vx * delta;
            sp3.mesh.position.y += sp3.vy * delta;
            sp3.mesh.position.z += sp3.vz * delta;
            sp3.mesh.material.opacity = 0.5 * (sp3.life / sp3.maxLife);
        }

        // Update wave rings
        for (var wi = 0; wi < this._waveRings.length; wi++) {
            var wr2 = this._waveRings[wi];
            if (wr2.life <= 0) continue;
            wr2.life -= delta;
            if (wr2.life <= 0) { wr2.mesh.visible = false; continue; }
            wr2.scale += delta * 1.5;
            wr2.mesh.scale.setScalar(wr2.scale);
            wr2.mesh.material.opacity = 0.3 * (wr2.life / wr2.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._trail) {
            this._trail.forEach(function(t) {
                scene.remove(t.mesh);
                t.mesh.geometry.dispose();
                t.mesh.material.dispose();
            });
        }
        if (this._sparks) {
            this._sparks.forEach(function(s) {
                scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                s.mesh.material.dispose();
            });
        }
        if (this._scaleGlow) {
            this._scaleGlow.forEach(function(g) {
                scene.remove(g.mesh);
                g.mesh.geometry.dispose();
                g.mesh.material.dispose();
            });
        }
        if (this._tongues) {
            this._tongues.forEach(function(t) {
                scene.remove(t.mesh);
                t.mesh.geometry.dispose();
                t.mesh.material.dispose();
            });
        }
        if (this._waveRings) {
            this._waveRings.forEach(function(w) {
                scene.remove(w.mesh);
                w.mesh.geometry.dispose();
                w.mesh.material.dispose();
            });
        }
        this._trail = this._sparks = this._scaleGlow = this._tongues = this._waveRings = null;
    }
};
