export default {
    name: 'Mulling',
    label: 'mulling',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Thought particles in lazy circular orbit (warm amber palette)
        this._thoughtParticles = [];
        var tGeo = new THREE.SphereGeometry(0.018, 6, 6);
        var amberColors = [0xffaa44, 0xddaa55, 0xcc8833, 0xffbb66, 0xee9944, 0xffcc77,
                           0xdd8844, 0xeeaa55, 0xff9933, 0xccaa66, 0xffbb44, 0xdd9955,
                           0xee8833, 0xffcc55, 0xcc9944, 0xddbb66, 0xff8844, 0xeecc77,
                           0xddaa44, 0xccbb55];
        for (var i = 0; i < 20; i++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: amberColors[i],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var tp = new THREE.Mesh(tGeo, tMat);
            tp.visible = false;
            scene.add(tp);

            var angle = (i / 20) * Math.PI * 2;
            var dist = 0.2 + (i % 3) * 0.08;
            this._thoughtParticles.push({
                mesh: tp,
                angle: angle,
                dist: dist,
                orbitSpeed: 0.4 + Math.random() * 0.3,
                yOffset: (Math.random() - 0.5) * 0.06,
                wobble: Math.random() * Math.PI * 2,
                size: 0.6 + Math.random() * 0.6
            });
        }

        // Bubble-up idea spheres (occasionally rise then sink back)
        this._bubbleIdeas = [];
        var bubGeo = new THREE.SphereGeometry(0.035, 8, 8);
        for (var b = 0; b < 5; b++) {
            var bMat = new THREE.MeshBasicMaterial({
                color: b % 2 === 0 ? 0xffdd88 : 0xffcc44,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bub = new THREE.Mesh(bubGeo, bMat);
            bub.visible = false;
            scene.add(bub);
            this._bubbleIdeas.push({
                mesh: bub,
                active: false,
                risePhase: 0,
                startAngle: 0,
                startX: 0, startY: 0,
                maxRise: 0.15 + Math.random() * 0.1
            });
        }
        this._lastBubble = 0;
        this._bubbleIdx = 0;

        // Warm ambient glow
        var glowGeo = new THREE.SphereGeometry(0.4, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xdd8833, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox, oy + 0.05, -0.05);
        scene.add(this._glow);

        // Swirl trail ring (visual wine-swirl effect)
        var swirlGeo = new THREE.TorusGeometry(0.22, 0.005, 6, 32);
        var swirlMat = new THREE.MeshBasicMaterial({
            color: 0xffaa55, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._swirlRing = new THREE.Mesh(swirlGeo, swirlMat);
        this._swirlRing.position.set(ox, oy + 0.05, 0.01);
        this._swirlRing.rotation.x = Math.PI * 0.4;
        this._swirlRing.visible = false;
        scene.add(this._swirlRing);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        // Variable speed multiplier: sometimes fast, sometimes near-stop
        var speedCycle = Math.sin(time * 0.5) * 0.5 + 0.5;
        var speedMult = 0.3 + speedCycle * 0.7;

        if (progress < 0.08) {
            // Phase 1: Particles appear, swirl starts
            var t = progress / 0.08;
            for (var i = 0; i < 20; i++) {
                if (t > i * 0.04) {
                    this._thoughtParticles[i].mesh.visible = true;
                    this._thoughtParticles[i].mesh.material.opacity = Math.min(0.6, (t - i * 0.04) * 3);
                }
            }
            this._swirlRing.visible = true;
            this._swirlRing.material.opacity = t * 0.2;
            this._glow.material.opacity = t * 0.03;

            model.position.set(ox, oy, oz);
        } else if (progress < 0.30) {
            // Phase 2: Lazy orbit, model head tilt
            var t2 = (progress - 0.08) / 0.22;
            this._glow.material.opacity = 0.03 + t2 * 0.04;
            this._swirlRing.material.opacity = 0.2 + Math.sin(time * 1.5) * 0.05;

            model.rotation.z = Math.sin(time * 0.4) * 0.04;
            model.position.set(ox + Math.sin(time * 0.3) * 0.005, oy, oz);

            // Start bubbles
            if (t2 > 0.5 && time - this._lastBubble > 2.5) {
                var bub = this._bubbleIdeas[this._bubbleIdx % this._bubbleIdeas.length];
                this._bubbleIdx++;
                bub.active = true;
                bub.risePhase = 0;
                bub.startAngle = Math.random() * Math.PI * 2;
                bub.startX = ox + Math.cos(bub.startAngle) * 0.18;
                bub.startY = oy + 0.05;
                bub.mesh.visible = true;
                bub.mesh.position.set(bub.startX, bub.startY, 0.04);
                this._lastBubble = time;
            }
        } else if (progress < 0.65) {
            // Phase 3: Mulling intensifies, speed varies more, ideas bubble
            var t3 = (progress - 0.30) / 0.35;
            this._glow.material.opacity = 0.07 + Math.sin(time * 1) * 0.02;
            this._swirlRing.material.opacity = 0.2 + Math.sin(time * 2) * 0.08;

            // Model shifts weight
            model.rotation.z = Math.sin(time * 0.35) * 0.05;
            model.position.set(
                ox + Math.sin(time * 0.25) * 0.008,
                oy + Math.sin(time * 0.4) * 0.003,
                oz
            );

            // Bubble ideas
            if (time - this._lastBubble > 2.0) {
                var bub2 = this._bubbleIdeas[this._bubbleIdx % this._bubbleIdeas.length];
                this._bubbleIdx++;
                bub2.active = true;
                bub2.risePhase = 0;
                bub2.startAngle = Math.random() * Math.PI * 2;
                bub2.startX = ox + Math.cos(bub2.startAngle) * 0.18;
                bub2.startY = oy + 0.05;
                bub2.mesh.visible = true;
                bub2.mesh.position.set(bub2.startX, bub2.startY, 0.04);
                this._lastBubble = time;
            }
        } else if (progress < 0.85) {
            // Phase 4: Settling, swirl slows
            var t4 = (progress - 0.65) / 0.20;
            speedMult *= (1 - t4 * 0.4);
            this._glow.material.opacity = 0.07 * (1 - t4 * 0.3);
            this._swirlRing.material.opacity = 0.2 * (1 - t4 * 0.3);

            model.rotation.z = Math.sin(time * 0.35) * 0.04 * (1 - t4 * 0.5);
            model.position.set(ox + Math.sin(time * 0.25) * 0.005 * (1 - t4), oy, oz);
        } else {
            // Phase 5: Fade out
            var t5 = (progress - 0.85) / 0.15;
            for (var j = 0; j < 20; j++) {
                this._thoughtParticles[j].mesh.material.opacity *= (1 - t5 * 0.06);
            }
            this._glow.material.opacity = 0.05 * (1 - t5);
            this._swirlRing.material.opacity = 0.14 * (1 - t5);

            model.position.set(ox, oy, oz);
            model.rotation.z = model.rotation.z * (1 - t5 * 0.3);
            if (t5 > 0.9) {
                model.rotation.z = 0;
                model.scale.copy(this._origScale);
            }
        }

        // Update thought particles orbit
        for (var pi = 0; pi < this._thoughtParticles.length; pi++) {
            var tp = this._thoughtParticles[pi];
            if (!tp.mesh.visible) continue;
            tp.angle += tp.orbitSpeed * delta * speedMult;
            var px = ox + Math.cos(tp.angle) * tp.dist;
            var py = oy + 0.05 + Math.sin(tp.angle) * tp.dist * 0.5 + tp.yOffset;
            py += Math.sin(time * 0.8 + tp.wobble) * 0.008;
            tp.mesh.position.set(px, py, 0.02);
            tp.mesh.scale.setScalar(tp.size * (0.8 + speedMult * 0.2));
        }

        // Update swirl ring
        this._swirlRing.rotation.z += delta * speedMult * 0.8;
        this._swirlRing.scale.setScalar(1 + Math.sin(time * 0.5) * 0.05);

        // Update bubble ideas
        for (var bi = 0; bi < this._bubbleIdeas.length; bi++) {
            var bb = this._bubbleIdeas[bi];
            if (!bb.active) continue;
            bb.risePhase += delta * 0.8;
            if (bb.risePhase < 1.0) {
                // Rising
                var riseT = bb.risePhase;
                var rise = Math.sin(riseT * Math.PI) * bb.maxRise;
                bb.mesh.position.set(bb.startX, bb.startY + rise, 0.04);
                bb.mesh.material.opacity = Math.sin(riseT * Math.PI) * 0.5;
                bb.mesh.scale.setScalar(0.5 + Math.sin(riseT * Math.PI) * 0.5);
            } else {
                // Sink and deactivate
                bb.active = false;
                bb.mesh.visible = false;
                bb.mesh.material.opacity = 0;
            }
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._thoughtParticles) {
            this._thoughtParticles.forEach(function(t) {
                scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose();
            });
        }
        if (this._bubbleIdeas) {
            this._bubbleIdeas.forEach(function(b) {
                scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose();
            });
        }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        if (this._swirlRing) { scene.remove(this._swirlRing); this._swirlRing.geometry.dispose(); this._swirlRing.material.dispose(); }
        this._thoughtParticles = this._bubbleIdeas = this._glow = this._swirlRing = null;
    }
};
