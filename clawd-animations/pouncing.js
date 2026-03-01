export default {
    name: 'Pouncing',
    label: 'pouncing',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Eye glow (two small spheres)
        var eyeGeo = new THREE.SphereGeometry(0.012, 8, 8);
        this._eyes = [];
        for (var i = 0; i < 2; i++) {
            var eMat = new THREE.MeshBasicMaterial({
                color: 0xffcc00, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var eye = new THREE.Mesh(eyeGeo, eMat);
            eye.visible = false;
            scene.add(eye);
            this._eyes.push({ mesh: eye });
        }

        // Target dot (red)
        var targetGeo = new THREE.SphereGeometry(0.015, 8, 8);
        var targetMat = new THREE.MeshBasicMaterial({
            color: 0xff2222, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._target = new THREE.Mesh(targetGeo, targetMat);
        this._target.visible = false;
        scene.add(this._target);

        // Target ring
        var targetRingGeo = new THREE.RingGeometry(0.025, 0.035, 16);
        var targetRingMat = new THREE.MeshBasicMaterial({
            color: 0xff4444, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this._targetRing = new THREE.Mesh(targetRingGeo, targetRingMat);
        this._targetRing.visible = false;
        scene.add(this._targetRing);

        // Impact burst particles
        this._burst = [];
        var burstGeo = new THREE.SphereGeometry(0.015, 6, 6);
        for (var j = 0; j < 20; j++) {
            var bColors = [0xff8800, 0xffaa22, 0xffcc44, 0x44ff44, 0xaaff44];
            var bMat = new THREE.MeshBasicMaterial({
                color: bColors[j % bColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var burst = new THREE.Mesh(burstGeo, bMat);
            burst.visible = false;
            scene.add(burst);
            this._burst.push({ mesh: burst, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._burstIdx = 0;

        // Success glow
        var glowGeo = new THREE.SphereGeometry(0.2, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0x44ff44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._successGlow = new THREE.Mesh(glowGeo, glowMat);
        this._successGlow.visible = false;
        scene.add(this._successGlow);

        // Predator ambiance (ground shadow)
        var shadowGeo = new THREE.CircleGeometry(0.15, 16);
        var shadowMat = new THREE.MeshBasicMaterial({
            color: 0x112200, transparent: true, opacity: 0,
            depthWrite: false, side: THREE.DoubleSide
        });
        this._shadow = new THREE.Mesh(shadowGeo, shadowMat);
        this._shadow.rotation.x = -Math.PI / 2;
        this._shadow.position.set(this._origPos.x, this._origPos.y - 0.2, 0);
        scene.add(this._shadow);

        this._targetX = this._origPos.x + 0.5;
        this._targetY = this._origPos.y;
        this._burstFired = false;
    },
    _fireBurst(x, y) {
        for (var i = 0; i < 15; i++) {
            var b = this._burst[this._burstIdx % this._burst.length];
            this._burstIdx++;
            b.mesh.visible = true;
            b.mesh.position.set(x, y, 0);
            var angle = Math.random() * Math.PI * 2;
            var spd = 1.5 + Math.random() * 2.5;
            b.vx = Math.cos(angle) * spd;
            b.vy = Math.sin(angle) * spd;
            b.vz = (Math.random() - 0.5) * 1.0;
            b.life = 0.4 + Math.random() * 0.4;
            b.maxLife = b.life;
            b.mesh.material.opacity = 1.0;
            b.mesh.scale.setScalar(0.5 + Math.random() * 1.0);
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var tx = this._targetX;
        var ty = this._targetY;

        if (progress < 0.12) {
            // Crouch: model compresses downward
            var t = progress / 0.12;
            var crouchY = orig.y - t * 0.08;
            model.position.set(orig.x, crouchY, orig.z);
            // Squash down
            model.scale.set(gs * (1 + t * 0.1), gs * (1 - t * 0.15), gs);
            model.rotation.z = t * 0.05;

            // Shadow appears
            this._shadow.material.opacity = t * 0.2;

            // Eyes glow
            for (var ei = 0; ei < 2; ei++) {
                this._eyes[ei].mesh.visible = true;
                var ex = orig.x + (ei === 0 ? -0.03 : 0.03);
                this._eyes[ei].mesh.position.set(ex, crouchY + 0.1, 0.05);
                this._eyes[ei].mesh.material.opacity = t * 0.6;
            }
        } else if (progress < 0.25) {
            // Target appears, predator focuses
            var t2 = (progress - 0.12) / 0.13;
            model.position.set(orig.x, orig.y - 0.08, orig.z);
            model.scale.set(gs * 1.1, gs * 0.85, gs);
            model.rotation.z = 0.05;

            // Target dot appears
            this._target.visible = true;
            this._target.position.set(tx, ty, 0);
            this._target.material.opacity = t2 * 0.8;

            this._targetRing.visible = true;
            this._targetRing.position.set(tx, ty, 0);
            this._targetRing.material.opacity = t2 * 0.5;
            this._targetRing.scale.setScalar(1 + Math.sin(time * 6) * 0.2);

            // Eyes intensify
            for (var ei2 = 0; ei2 < 2; ei2++) {
                this._eyes[ei2].mesh.material.opacity = 0.6 + Math.sin(time * 4) * 0.2;
                this._eyes[ei2].mesh.material.color.setHex(0xffaa00);
            }
        } else if (progress < 0.38) {
            // Wiggle: subtle side-to-side pre-pounce
            var t3 = (progress - 0.25) / 0.13;
            var wiggleFreq = 8 + t3 * 12; // Gets faster
            var wiggleAmp = 0.02 + t3 * 0.02;
            var wiggle = Math.sin(time * wiggleFreq) * wiggleAmp;

            model.position.set(orig.x + wiggle, orig.y - 0.08, orig.z);
            model.scale.set(gs * (1.1 + t3 * 0.02), gs * (0.85 - t3 * 0.03), gs);
            model.rotation.z = 0.05 + wiggle * 0.5;

            // Target pulses faster
            this._target.material.opacity = 0.8 + Math.sin(time * 8) * 0.2;
            this._targetRing.material.opacity = 0.5 + Math.sin(time * 8) * 0.2;
            this._targetRing.scale.setScalar(1 + Math.sin(time * 8) * 0.3);

            // Eyes locked on target
            for (var ei3 = 0; ei3 < 2; ei3++) {
                this._eyes[ei3].mesh.material.opacity = 0.8;
            }
        } else if (progress < 0.55) {
            // POUNCE! Explosive leap arc
            var t4 = (progress - 0.38) / 0.17;
            // Arc from crouch to target
            var pounceX = orig.x + (tx - orig.x) * t4;
            var arcHeight = Math.sin(t4 * Math.PI) * 0.35;
            var pounceY = orig.y + arcHeight - 0.08 * (1 - t4);

            model.position.set(pounceX, pounceY, orig.z);

            // Stretch during flight (elongate in direction of travel)
            var stretchX = gs * (1 + (1 - Math.abs(t4 - 0.5) * 2) * 0.25);
            var stretchY = gs * (1 - (1 - Math.abs(t4 - 0.5) * 2) * 0.1);
            model.scale.set(stretchX, stretchY, gs);

            // Rotation follows arc
            model.rotation.z = -Math.atan2(arcHeight > 0.17 ? -1 : 1, 1) * 0.3 * (1 - t4);

            // Eyes follow
            for (var ei4 = 0; ei4 < 2; ei4++) {
                this._eyes[ei4].mesh.position.set(pounceX + (ei4 === 0 ? -0.03 : 0.03), pounceY + 0.1, 0.05);
                this._eyes[ei4].mesh.material.opacity = 0.9;
            }

            // Target shrinks as model approaches
            this._target.material.opacity = 0.8 * (1 - t4 * 0.5);
            this._targetRing.material.opacity = 0.5 * (1 - t4 * 0.5);

            // Shadow follows below
            this._shadow.position.x = pounceX;
            this._shadow.material.opacity = 0.15;
        } else if (progress < 0.65) {
            // Impact! Burst particles, squash
            var t5 = (progress - 0.55) / 0.10;

            if (!this._burstFired) {
                this._fireBurst(tx, ty);
                this._burstFired = true;
            }

            // Squash on impact
            var impactSquash = Math.max(0, 1 - t5 * 2);
            model.position.set(tx, ty - impactSquash * 0.05, orig.z);
            model.scale.set(
                gs * (1 + impactSquash * 0.2),
                gs * (1 - impactSquash * 0.15),
                gs
            );
            model.rotation.z = 0;

            // Target gone
            this._target.visible = false;
            this._targetRing.visible = false;

            // Eyes dim
            for (var ei5 = 0; ei5 < 2; ei5++) {
                this._eyes[ei5].mesh.position.set(tx + (ei5 === 0 ? -0.03 : 0.03), ty + 0.1, 0.05);
                this._eyes[ei5].mesh.material.opacity = 0.5 * (1 - t5);
            }

            this._shadow.position.x = tx;
        } else if (progress < 0.80) {
            // Success glow, satisfied pose
            var t6 = (progress - 0.65) / 0.15;

            this._successGlow.visible = true;
            this._successGlow.position.set(tx, ty, 0);
            this._successGlow.material.opacity = Math.sin(t6 * Math.PI) * 0.2;
            this._successGlow.scale.setScalar(1 + t6 * 0.5);

            model.position.set(tx, ty, orig.z);
            model.scale.set(gs * (1 + Math.sin(t6 * Math.PI) * 0.05), gs * (1 + Math.sin(t6 * Math.PI) * 0.05), gs);
            model.rotation.z = 0;

            for (var ei6 = 0; ei6 < 2; ei6++) {
                this._eyes[ei6].mesh.visible = t6 < 0.5;
                this._eyes[ei6].mesh.material.opacity = 0.3 * (1 - t6 * 2);
            }
        } else {
            // Return to position, everything fades
            var t7 = (progress - 0.80) / 0.20;
            var returnX = tx + (orig.x - tx) * t7;
            model.position.set(returnX, orig.y, orig.z);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            this._successGlow.material.opacity = 0.15 * (1 - t7);
            if (t7 > 0.5) this._successGlow.visible = false;

            this._shadow.material.opacity = 0.15 * (1 - t7);

            for (var ei7 = 0; ei7 < 2; ei7++) {
                this._eyes[ei7].mesh.visible = false;
            }
        }

        // Update burst particles
        for (var bi = 0; bi < this._burst.length; bi++) {
            var bp = this._burst[bi];
            if (bp.life <= 0) continue;
            bp.life -= delta;
            if (bp.life <= 0) { bp.mesh.visible = false; continue; }
            bp.mesh.position.x += bp.vx * delta;
            bp.mesh.position.y += bp.vy * delta;
            bp.mesh.position.z += bp.vz * delta;
            bp.vy -= 3.0 * delta;
            bp.mesh.material.opacity = (bp.life / bp.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._eyes) {
            this._eyes.forEach(function(e) {
                scene.remove(e.mesh);
                e.mesh.geometry.dispose();
                e.mesh.material.dispose();
            });
        }
        if (this._target) {
            scene.remove(this._target);
            this._target.geometry.dispose();
            this._target.material.dispose();
        }
        if (this._targetRing) {
            scene.remove(this._targetRing);
            this._targetRing.geometry.dispose();
            this._targetRing.material.dispose();
        }
        if (this._burst) {
            this._burst.forEach(function(b) {
                scene.remove(b.mesh);
                b.mesh.geometry.dispose();
                b.mesh.material.dispose();
            });
        }
        if (this._successGlow) {
            scene.remove(this._successGlow);
            this._successGlow.geometry.dispose();
            this._successGlow.material.dispose();
        }
        if (this._shadow) {
            scene.remove(this._shadow);
            this._shadow.geometry.dispose();
            this._shadow.material.dispose();
        }
        this._eyes = this._target = this._targetRing = this._burst = this._successGlow = this._shadow = null;
    }
};
