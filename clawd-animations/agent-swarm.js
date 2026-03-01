import { cloneWithMaterials, setCloneOpacity, disposeClone } from './helpers.js';

export default {
    name: 'Agent Swarm',
    label: 'swarming',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        this._cs = this._origScale.x * 0.45; // clone scale relative to model
        this._cloneCount = 9;
        this._clones = [];
        this._cloneGroup = new THREE.Group();
        scene.add(this._cloneGroup);

        // Clone the actual GLB model for each swarm member
        var formations = [
            { row: 0, col: 0 }, { row: -1, col: -1 }, { row: 1, col: -1 },
            { row: -2, col: -2 }, { row: 2, col: -2 }, { row: 0, col: -2 },
            { row: -1, col: -3 }, { row: 1, col: -3 }, { row: 0, col: -4 }
        ];
        for (var i = 0; i < this._cloneCount; i++) {
            var clone = cloneWithMaterials(model);
            setCloneOpacity(clone, 0);
            clone.visible = false;
            // V-shape pointing left (march direction)
            clone.userData.formX = formations[i].col * 0.35;
            clone.userData.formY = formations[i].row * 0.3;
            clone.userData.bobPhase = Math.random() * Math.PI * 2;
            clone.userData.bobSpeed = 3.0 + Math.random() * 2.0;
            this._cloneGroup.add(clone);
            this._clones.push(clone);
        }

        // Dust trail particles
        this._dustParticles = [];
        var dustGeo = new THREE.SphereGeometry(0.03, 4, 4);
        for (var d = 0; d < 15; d++) {
            var dm = new THREE.MeshBasicMaterial({
                color: 0xddccbb, transparent: true, opacity: 0,
                depthWrite: false
            });
            var dust = new THREE.Mesh(dustGeo, dm);
            dust.visible = false;
            this._cloneGroup.add(dust);
            this._dustParticles.push({
                mesh: dust, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._dustIdx = 0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var cs = this._cs;

        if (progress < 0.15) {
            // Phase 1: model vibrates, preparing to split
            var t = progress / 0.15;
            var shake = Math.sin(time * 30) * 0.04 * t;
            model.position.x = orig.x + shake;
            model.scale.set(
                this._origScale.x * (1 - t * 0.3),
                this._origScale.y * (1 - t * 0.3),
                this._origScale.z * (1 - t * 0.3)
            );
            model.visible = t < 0.9;

            for (var i = 0; i < this._clones.length; i++) {
                var c = this._clones[i];
                var appear = Math.max(0, (t - 0.3 - i * 0.05) / 0.4);
                setCloneOpacity(c, appear * 0.85);
                c.visible = appear > 0;
                c.position.copy(orig);
                c.scale.setScalar(appear * cs);
            }
        } else if (progress < 0.35) {
            // Phase 2: clones scatter into V formation
            var t2 = (progress - 0.15) / 0.2;
            var ease = 1 - Math.pow(1 - t2, 3);
            model.visible = false;

            for (var j = 0; j < this._clones.length; j++) {
                var cl = this._clones[j];
                setCloneOpacity(cl, 0.85);
                cl.visible = true;
                cl.position.set(
                    orig.x + cl.userData.formX * ease,
                    orig.y + cl.userData.formY * ease,
                    orig.z
                );
                cl.scale.setScalar(cs);
            }
        } else if (progress < 0.75) {
            // Phase 3: march leftward across the canvas in formation
            var t3 = (progress - 0.35) / 0.4;
            var marchX = -t3 * 3.5; // march left across terminals
            model.visible = false;

            for (var k = 0; k < this._clones.length; k++) {
                var cm = this._clones[k];
                setCloneOpacity(cm, 0.85);
                cm.visible = true;
                var bob = Math.abs(Math.sin(time * cm.userData.bobSpeed + cm.userData.bobPhase)) * 0.06;
                var sway = Math.sin(time * 2 + cm.userData.bobPhase) * 0.02;
                cm.position.set(
                    orig.x + cm.userData.formX + marchX,
                    orig.y + cm.userData.formY + bob,
                    orig.z + sway
                );
                cm.rotation.z = 0.1 + Math.sin(time * cm.userData.bobSpeed + cm.userData.bobPhase) * 0.05;
                cm.scale.setScalar(cs);
            }

            if (Math.random() < 0.3) {
                var di = this._dustIdx % this._dustParticles.length;
                var dp = this._dustParticles[di];
                dp.mesh.visible = true;
                dp.mesh.position.set(
                    orig.x + 0.5 + marchX + (Math.random() - 0.5) * 0.3,
                    orig.y + 0.2 + Math.random() * 0.2,
                    orig.z + (Math.random() - 0.5) * 0.3
                );
                dp.life = 0.4 + Math.random() * 0.3;
                dp.maxLife = dp.life;
                dp.vx = 0.5 + Math.random() * 0.3;
                dp.vy = 0.3 + Math.random() * 0.2;
                this._dustIdx++;
            }
        } else if (progress < 0.9) {
            // Phase 4: clones converge back to origin
            var t4 = (progress - 0.75) / 0.15;
            var conv = t4 * t4;
            model.visible = false;

            var marchEnd = -3.5;
            for (var m = 0; m < this._clones.length; m++) {
                var cc = this._clones[m];
                setCloneOpacity(cc, 0.85 * (1 - conv * 0.3));
                cc.visible = true;
                cc.position.set(
                    orig.x + (cc.userData.formX + marchEnd) * (1 - conv),
                    orig.y + cc.userData.formY * (1 - conv),
                    orig.z
                );
                cc.scale.setScalar(cs * (1 - conv * 0.5));
                cc.rotation.z = 0;
            }
        } else {
            // Phase 5: merge back into original model
            var t5 = (progress - 0.9) / 0.1;
            var emerge = t5 * t5;
            model.visible = true;
            model.position.copy(orig);
            model.scale.set(
                this._origScale.x * emerge,
                this._origScale.y * emerge,
                this._origScale.z * emerge
            );

            for (var n = 0; n < this._clones.length; n++) {
                var cf = this._clones[n];
                setCloneOpacity(cf, 0.85 * (1 - t5));
                cf.visible = t5 < 0.9;
                cf.position.copy(orig);
                cf.scale.setScalar(cs * (1 - t5) * 0.5);
            }
        }

        // Update dust particles
        for (var p = 0; p < this._dustParticles.length; p++) {
            var part = this._dustParticles[p];
            if (part.life <= 0) continue;
            part.life -= delta;
            if (part.life <= 0) { part.mesh.visible = false; continue; }
            part.mesh.position.x += part.vx * delta;
            part.mesh.position.y += part.vy * delta;
            var lr = part.life / part.maxLife;
            part.mesh.material.opacity = 0.4 * lr;
            part.mesh.scale.setScalar(0.5 + (1 - lr) * 1.0);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.visible = true;
        if (this._clones) {
            for (var i = 0; i < this._clones.length; i++) { disposeClone(this._clones[i]); }
        }
        if (this._dustParticles) {
            for (var d = 0; d < this._dustParticles.length; d++) {
                this._dustParticles[d].mesh.geometry.dispose();
                this._dustParticles[d].mesh.material.dispose();
            }
        }
        if (this._cloneGroup) scene.remove(this._cloneGroup);
        this._clones = this._cloneGroup = this._dustParticles = null;
    }
};
