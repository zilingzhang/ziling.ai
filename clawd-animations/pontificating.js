export default {
    name: 'Pontificating',
    label: 'pontificating',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Podium (box that rises up)
        var podGeo = new THREE.BoxGeometry(0.15, 0.12, 0.08);
        var podMat = new THREE.MeshBasicMaterial({
            color: 0x886644, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._podium = new THREE.Mesh(podGeo, podMat);
        this._podium.position.set(ox, oy - 0.15, 0.02);
        this._podium.visible = false;
        scene.add(this._podium);

        // Sound wave tori (blasting outward from model)
        this._waveRings = [];
        for (var i = 0; i < 8; i++) {
            var wrGeo = new THREE.TorusGeometry(0.05, 0.006, 6, 24);
            var wrMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0xffcc44 : (i % 3 === 1 ? 0xffaa33 : 0xffdd55),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var wr = new THREE.Mesh(wrGeo, wrMat);
            wr.position.set(ox, oy + 0.1, 0);
            wr.rotation.x = Math.PI * 0.5;
            wr.visible = false;
            scene.add(wr);
            this._waveRings.push({
                mesh: wr,
                active: false,
                startTime: 0,
                expandSpeed: 0.6 + Math.random() * 0.4,
                baseRadius: 0.05
            });
        }
        this._ringIdx = 0;
        this._lastRingSpawn = 0;

        // Audience particle clusters (small groups reacting)
        this._audience = [];
        var audGeo = new THREE.SphereGeometry(0.015, 5, 5);
        var audPositions = [
            { x: -0.4, y: -0.15 }, { x: -0.3, y: -0.18 }, { x: -0.2, y: -0.16 },
            { x: 0.2, y: -0.16 }, { x: 0.3, y: -0.18 }, { x: 0.4, y: -0.15 },
            { x: -0.35, y: -0.22 }, { x: -0.15, y: -0.2 }, { x: 0.15, y: -0.2 },
            { x: 0.35, y: -0.22 }, { x: 0, y: -0.22 }, { x: -0.25, y: -0.25 }
        ];
        for (var a = 0; a < 12; a++) {
            var aMat = new THREE.MeshBasicMaterial({
                color: a % 3 === 0 ? 0x8899aa : (a % 3 === 1 ? 0x7788bb : 0x9988aa),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var aud = new THREE.Mesh(audGeo, aMat);
            aud.visible = false;
            scene.add(aud);
            this._audience.push({
                mesh: aud,
                baseX: ox + audPositions[a].x,
                baseY: oy + audPositions[a].y,
                bouncePhase: Math.random() * Math.PI * 2,
                bounceAmp: 0
            });
        }

        // Emphatic gesture glow
        var gestGeo = new THREE.SphereGeometry(0.15, 10, 10);
        var gestMat = new THREE.MeshBasicMaterial({
            color: 0xffcc44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._gestureGlow = new THREE.Mesh(gestGeo, gestMat);
        this._gestureGlow.position.set(ox, oy + 0.15, -0.02);
        scene.add(this._gestureGlow);
    },
    _spawnWaveRing(ox, oy, time) {
        var wr = this._waveRings[this._ringIdx % this._waveRings.length];
        this._ringIdx++;
        wr.active = true;
        wr.startTime = time;
        wr.mesh.visible = true;
        wr.mesh.position.set(ox, oy + 0.1, 0);
        wr.mesh.scale.setScalar(1);
        wr.mesh.material.opacity = 0.5;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.10) {
            // Phase 1: Podium appears, model rises behind it
            var t = progress / 0.10;
            this._podium.visible = true;
            this._podium.material.opacity = t * 0.5;
            this._podium.position.set(ox, oy - 0.2 + t * 0.05, 0.02);

            model.position.set(ox, oy + t * 0.02, oz);

            // Audience appears
            for (var ai = 0; ai < 12; ai++) {
                if (t > ai * 0.06) {
                    this._audience[ai].mesh.visible = true;
                    this._audience[ai].mesh.material.opacity = Math.min(0.4, (t - ai * 0.06) * 2);
                    this._audience[ai].mesh.position.set(this._audience[ai].baseX, this._audience[ai].baseY, 0);
                }
            }
        } else if (progress < 0.30) {
            // Phase 2: Model starts speaking, first wave rings
            var t2 = (progress - 0.10) / 0.20;
            model.position.set(ox, oy + 0.02, oz);

            // Bob forward/back (emphatic gestures)
            var bob = Math.sin(time * 3) * 0.008;
            model.position.x = ox + bob;

            this._gestureGlow.material.opacity = 0.05 + Math.abs(bob) * 5;

            // Spawn wave rings
            if (time - this._lastRingSpawn > 0.6) {
                this._spawnWaveRing(ox, oy, time);
                this._lastRingSpawn = time;
            }

            // Audience reacts gently
            for (var aj = 0; aj < 12; aj++) {
                this._audience[aj].mesh.material.opacity = 0.4;
                this._audience[aj].bounceAmp = 0.003;
            }
        } else if (progress < 0.60) {
            // Phase 3: Speaking intensifies, bigger wave rings
            var t3 = (progress - 0.30) / 0.30;
            var bobIntense = Math.sin(time * 4) * 0.012;
            model.position.set(ox + bobIntense, oy + 0.02 + Math.sin(time * 2) * 0.003, oz);
            model.rotation.z = Math.sin(time * 3) * 0.02;

            this._gestureGlow.material.opacity = 0.08 + Math.abs(bobIntense) * 8;
            this._gestureGlow.scale.setScalar(1 + Math.abs(Math.sin(time * 4)) * 0.3);

            // More frequent wave rings
            if (time - this._lastRingSpawn > 0.35) {
                this._spawnWaveRing(ox, oy, time);
                this._lastRingSpawn = time;
            }

            // Audience bounces more
            for (var ak = 0; ak < 12; ak++) {
                this._audience[ak].bounceAmp = 0.005 + t3 * 0.005;
                this._audience[ak].mesh.material.opacity = 0.4 + Math.sin(time * 3 + ak) * 0.1;
            }

            this._podium.material.opacity = 0.5 + Math.sin(time * 2) * 0.05;
        } else if (progress < 0.80) {
            // Phase 4: Volume intensifies, grand buildup
            var t4 = (progress - 0.60) / 0.20;
            var bobMax = Math.sin(time * 5) * 0.015;
            model.position.set(ox + bobMax, oy + 0.025, oz);
            model.rotation.z = Math.sin(time * 4) * 0.025;

            this._gestureGlow.material.opacity = 0.12 + t4 * 0.08;
            this._gestureGlow.scale.setScalar(1.2 + Math.abs(Math.sin(time * 5)) * 0.4);
            this._gestureGlow.material.color.setHex(0xffdd66);

            // Rapid wave rings
            if (time - this._lastRingSpawn > 0.2) {
                this._spawnWaveRing(ox, oy, time);
                this._lastRingSpawn = time;
            }

            // Audience bounces vigorously
            for (var al = 0; al < 12; al++) {
                this._audience[al].bounceAmp = 0.01 + t4 * 0.005;
            }
        } else if (progress < 0.90) {
            // Phase 5: Grand finale gesture - biggest ring
            var t5 = (progress - 0.80) / 0.10;
            var finalBob = Math.sin(t5 * Math.PI) * 0.02;
            model.position.set(ox + finalBob, oy + 0.025, oz);
            model.rotation.z = Math.sin(t5 * Math.PI) * 0.03;

            this._gestureGlow.material.opacity = (0.2 + Math.sin(t5 * Math.PI) * 0.15) * (1 - t5 * 0.3);
            this._gestureGlow.scale.setScalar(1.5 + Math.sin(t5 * Math.PI) * 0.5);

            if (t5 < 0.2 && time - this._lastRingSpawn > 0.1) {
                this._spawnWaveRing(ox, oy, time);
                this._spawnWaveRing(ox, oy, time);
                this._lastRingSpawn = time;
            }

            for (var am = 0; am < 12; am++) {
                this._audience[am].bounceAmp = 0.015 * (1 - t5 * 0.5);
            }
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.90) / 0.10;
            this._podium.material.opacity = 0.5 * (1 - t6);
            this._gestureGlow.material.opacity = 0.1 * (1 - t6);

            for (var an = 0; an < 12; an++) {
                this._audience[an].mesh.material.opacity = 0.4 * (1 - t6);
                this._audience[an].bounceAmp *= (1 - t6 * 0.1);
            }

            model.position.set(ox, oy + 0.025 * (1 - t6), oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update wave rings (expand and fade)
        for (var wi = 0; wi < this._waveRings.length; wi++) {
            var ring = this._waveRings[wi];
            if (!ring.active) continue;
            var elapsed = time - ring.startTime;
            var dur = 1.5;
            if (elapsed > dur) {
                ring.active = false;
                ring.mesh.visible = false;
                continue;
            }
            var rt = elapsed / dur;
            ring.mesh.scale.setScalar(1 + rt * ring.expandSpeed * 8);
            ring.mesh.material.opacity = (1 - rt) * 0.4;
        }

        // Update audience bounce
        for (var au = 0; au < this._audience.length; au++) {
            var aud = this._audience[au];
            if (!aud.mesh.visible) continue;
            var bounce = Math.sin(time * 4 + aud.bouncePhase) * aud.bounceAmp;
            aud.mesh.position.set(aud.baseX, aud.baseY + bounce, 0);
        }

        this._gestureGlow.position.set(model.position.x, model.position.y + 0.05, -0.02);
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._podium) { scene.remove(this._podium); this._podium.geometry.dispose(); this._podium.material.dispose(); }
        if (this._waveRings) {
            this._waveRings.forEach(function(w) {
                scene.remove(w.mesh); w.mesh.geometry.dispose(); w.mesh.material.dispose();
            });
        }
        if (this._audience) {
            this._audience.forEach(function(a) {
                scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose();
            });
        }
        if (this._gestureGlow) { scene.remove(this._gestureGlow); this._gestureGlow.geometry.dispose(); this._gestureGlow.material.dispose(); }
        this._podium = this._waveRings = this._audience = this._gestureGlow = null;
    }
};
