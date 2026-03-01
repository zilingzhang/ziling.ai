import { cloneWithMaterials, setCloneOpacity, setCloneEmissive, disposeClone } from './helpers.js';

export default {
    name: 'Laser Beam',
    label: 'melting',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        this._ts = this._origScale.x * 0.7; // target scale relative to model

        // "Problem" target — clone of model tinted red, placed to the left
        this._targetX = this._origPos.x - 2.0;
        this._targetY = this._origPos.y;
        this._target = cloneWithMaterials(model);
        setCloneOpacity(this._target, 0);
        setCloneEmissive(this._target, 0xaa2200, 0.5);
        this._target.position.set(this._targetX, this._targetY, 0);
        this._target.scale.setScalar(this._ts);
        this._target.visible = false;
        scene.add(this._target);

        // Crosshair over target
        var crossGeo = new THREE.BoxGeometry(0.02, 0.25, 0.02);
        var crossMat = new THREE.MeshBasicMaterial({
            color: 0xff4444, transparent: true, opacity: 0
        });
        this._crossV = new THREE.Mesh(crossGeo, crossMat);
        this._crossV.position.set(this._targetX, this._targetY + 0.3, 0.2);
        scene.add(this._crossV);
        this._crossH = new THREE.Mesh(
            new THREE.BoxGeometry(0.25, 0.02, 0.02),
            crossMat.clone()
        );
        this._crossH.position.set(this._targetX, this._targetY + 0.3, 0.2);
        scene.add(this._crossH);

        // Charge-up particles
        this._chargeParticles = [];
        var cpGeo = new THREE.SphereGeometry(0.03, 6, 6);
        for (var i = 0; i < 20; i++) {
            var cMat = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0x00ccff : 0xffffff,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var cp = new THREE.Mesh(cpGeo, cMat);
            cp.visible = false;
            scene.add(cp);
            this._chargeParticles.push({
                mesh: cp,
                startAngle: (i / 20) * Math.PI * 2,
                startRadius: 1.5 + Math.random() * 0.8,
                heightOffset: (Math.random() - 0.5) * 1.5,
                speed: 0.8 + Math.random() * 0.5
            });
        }

        // Charge glow around model
        var glowGeo = new THREE.SphereGeometry(0.5, 16, 16);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0x00aaff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._chargeGlow = new THREE.Mesh(glowGeo, glowMat);
        this._chargeGlow.position.copy(this._origPos);
        this._chargeGlow.position.y += 0.5;
        scene.add(this._chargeGlow);

        // Laser beam fires leftward from model to target
        var beamLen = Math.abs(this._origPos.x - this._targetX);
        var beamGeo = new THREE.CylinderGeometry(0.08, 0.08, beamLen, 12);
        beamGeo.rotateZ(Math.PI / 2);
        var beamMat = new THREE.MeshBasicMaterial({
            color: 0x00ccff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._beam = new THREE.Mesh(beamGeo, beamMat);
        this._beam.visible = false;
        this._beamCenterX = (this._origPos.x + this._targetX) / 2;
        scene.add(this._beam);

        var beamGlowGeo = new THREE.CylinderGeometry(0.2, 0.2, beamLen, 12);
        beamGlowGeo.rotateZ(Math.PI / 2);
        var beamGlowMat = new THREE.MeshBasicMaterial({
            color: 0x0066ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._beamGlow = new THREE.Mesh(beamGlowGeo, beamGlowMat);
        this._beamGlow.visible = false;
        scene.add(this._beamGlow);

        // Melt particles from target
        this._meltParticles = [];
        var mpGeo = new THREE.SphereGeometry(0.03, 4, 4);
        for (var m = 0; m < 25; m++) {
            var mMat = new THREE.MeshBasicMaterial({
                color: m % 3 === 0 ? 0xff6600 : (m % 3 === 1 ? 0xff0000 : 0xffcc00),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var mp = new THREE.Mesh(mpGeo, mMat);
            mp.visible = false;
            scene.add(mp);
            this._meltParticles.push({
                mesh: mp, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }
        this._meltIdx = 0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var beamY = orig.y + 0.3;
        var tx = this._targetX, ty = this._targetY;

        if (progress < 0.1) {
            // Target appears
            var t = progress / 0.1;
            this._target.visible = true;
            setCloneOpacity(this._target, t * 0.9);
            this._target.scale.setScalar(this._ts * t);
            this._crossV.material.opacity = t * 0.8;
            this._crossH.material.opacity = t * 0.8;
            this._crossV.scale.setScalar(t);
            this._crossH.scale.setScalar(t);
        } else if (progress < 0.35) {
            // Charge-up
            var t2 = (progress - 0.1) / 0.25;
            setCloneOpacity(this._target, 0.9);
            this._target.scale.setScalar(this._ts);
            this._crossV.material.opacity = 0.8;
            this._crossH.material.opacity = 0.8;

            var shake = t2 * t2 * 0.08;
            model.position.x = orig.x + Math.sin(time * 20) * shake;
            model.position.y = orig.y + Math.cos(time * 17) * shake * 0.5;

            this._chargeGlow.material.opacity = t2 * 0.3;
            this._chargeGlow.scale.setScalar(0.5 + t2 * 0.8);
            this._chargeGlow.position.set(orig.x, orig.y + 0.5, 0);

            for (var i = 0; i < this._chargeParticles.length; i++) {
                var cp = this._chargeParticles[i];
                cp.mesh.visible = true;
                var radius = cp.startRadius * (1 - t2 * 0.8);
                var angle = cp.startAngle + time * 3 * cp.speed;
                cp.mesh.position.set(
                    orig.x + Math.cos(angle) * radius,
                    orig.y + 0.5 + cp.heightOffset * (1 - t2),
                    Math.sin(angle) * radius * 0.5
                );
                cp.mesh.material.opacity = t2 * 0.7;
                cp.mesh.scale.setScalar(0.5 + t2 * 0.8);
            }

            model.rotation.z = t2 * 0.08;
            model.scale.set(
                this._origScale.x * (1 + t2 * 0.05),
                this._origScale.y * (1 + t2 * 0.05),
                this._origScale.z
            );
        } else if (progress < 0.7) {
            // FIRE THE BEAM leftward
            var t3 = (progress - 0.35) / 0.35;

            for (var j = 0; j < this._chargeParticles.length; j++) {
                this._chargeParticles[j].mesh.visible = false;
            }
            this._chargeGlow.material.opacity = 0.15 + Math.sin(time * 8) * 0.1;
            this._chargeGlow.scale.setScalar(0.8 + Math.sin(time * 6) * 0.2);

            this._beam.visible = true;
            this._beamGlow.visible = true;
            this._beam.position.set(this._beamCenterX, beamY, 0);
            this._beamGlow.position.set(this._beamCenterX, beamY, 0);

            var beamPulse = 0.8 + Math.sin(time * 12) * 0.15;
            this._beam.material.opacity = beamPulse;
            this._beam.scale.set(1, 0.8 + Math.sin(time * 15) * 0.3, 0.8 + Math.cos(time * 15) * 0.3);
            this._beamGlow.material.opacity = beamPulse * 0.25;
            this._beamGlow.scale.set(1, 0.6 + Math.sin(time * 10) * 0.3, 0.6 + Math.cos(time * 10) * 0.3);

            // Model braces against recoil
            model.position.x = orig.x + 0.05 + Math.sin(time * 15) * 0.02;
            model.position.y = orig.y;
            model.rotation.z = 0.08;

            // Target melts
            var mp = t3;
            var ts = Math.max(0.01, this._ts * (1 - mp * 0.9));
            this._target.scale.set(ts, ts * (1 + mp * 0.3), ts);
            setCloneEmissive(this._target,
                mp < 0.3 ? 0xaa2200 : mp < 0.6 ? 0xcc4400 : 0xff6600,
                0.5 + mp * 1.5
            );
            setCloneOpacity(this._target, Math.max(0, 0.9 - mp * 0.5));
            this._crossV.material.opacity = Math.max(0, 0.8 - mp * 1.2);
            this._crossH.material.opacity = Math.max(0, 0.8 - mp * 1.2);

            this._target.position.y = ty - mp * 0.3;
            this._crossV.position.y = ty + 0.3 - mp * 0.3;
            this._crossH.position.y = ty + 0.3 - mp * 0.3;

            if (Math.random() < 0.4 + mp * 0.4) {
                var mi = this._meltIdx % this._meltParticles.length;
                var mpart = this._meltParticles[mi];
                mpart.mesh.visible = true;
                mpart.mesh.position.set(
                    tx + (Math.random() - 0.5) * 0.3,
                    ty - mp * 0.3 + (Math.random() - 0.5) * 0.3,
                    (Math.random() - 0.5) * 0.3
                );
                mpart.vx = (Math.random() - 0.5) * 1.5;
                mpart.vy = 0.5 + Math.random() * 1.5;
                mpart.vz = (Math.random() - 0.5) * 1.0;
                mpart.life = 0.4 + Math.random() * 0.4;
                mpart.maxLife = mpart.life;
                this._meltIdx++;
            }
        } else if (progress < 0.85) {
            // Beam powers down
            var t4 = (progress - 0.7) / 0.15;
            this._beam.material.opacity = (1 - t4) * 0.8;
            this._beamGlow.material.opacity = (1 - t4) * 0.2;
            this._beam.scale.set(1, (1 - t4), (1 - t4));
            this._beamGlow.scale.set(1, (1 - t4), (1 - t4));
            this._beam.position.set(this._beamCenterX, beamY, 0);
            this._beamGlow.position.set(this._beamCenterX, beamY, 0);

            if (t4 > 0.5) {
                this._beam.visible = false;
                this._beamGlow.visible = false;
            }

            this._chargeGlow.material.opacity = 0.15 * (1 - t4);
            setCloneOpacity(this._target, 0.4 * (1 - t4));
            this._target.visible = t4 < 0.8;

            model.position.x = orig.x;
            model.position.y = orig.y;
            model.rotation.z = 0.08 * (1 - t4);
        } else {
            // Return to rest
            var t5 = (progress - 0.85) / 0.15;
            this._beam.visible = false;
            this._beamGlow.visible = false;
            this._target.visible = false;
            this._chargeGlow.material.opacity = 0;

            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update melt particles
        for (var p = 0; p < this._meltParticles.length; p++) {
            var part = this._meltParticles[p];
            if (part.life <= 0) continue;
            part.life -= delta;
            if (part.life <= 0) { part.mesh.visible = false; continue; }
            part.mesh.position.x += part.vx * delta;
            part.mesh.position.y += part.vy * delta;
            part.mesh.position.z += part.vz * delta;
            part.vy -= 2 * delta;
            var lr = part.life / part.maxLife;
            part.mesh.material.opacity = 0.8 * lr;
            part.mesh.scale.setScalar(0.3 + 0.7 * lr);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._target) { disposeClone(this._target); scene.remove(this._target); }
        [this._crossV, this._crossH, this._beam, this._beamGlow, this._chargeGlow].forEach(function(m) {
            if (m) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
        });
        if (this._chargeParticles) { this._chargeParticles.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        if (this._meltParticles) { this._meltParticles.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        this._target = this._crossV = this._crossH = this._beam = this._beamGlow = this._chargeGlow = null;
        this._chargeParticles = this._meltParticles = null;
    }
};
