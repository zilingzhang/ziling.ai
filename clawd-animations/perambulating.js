export default {
    name: 'Perambulating',
    label: 'perambulating',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Top hat (small cylinder on head)
        var hatGeo = new THREE.CylinderGeometry(0.04, 0.045, 0.07, 12);
        var hatMat = new THREE.MeshBasicMaterial({
            color: 0x2a1f14, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._hat = new THREE.Mesh(hatGeo, hatMat);
        scene.add(this._hat);

        // Hat brim (flat disc)
        var brimGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.005, 16);
        var brimMat = new THREE.MeshBasicMaterial({
            color: 0x2a1f14, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._brim = new THREE.Mesh(brimGeo, brimMat);
        scene.add(this._brim);

        // Walking stick (thin cylinder)
        var stickGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.35, 6);
        var stickMat = new THREE.MeshBasicMaterial({
            color: 0x8b6914, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._stick = new THREE.Mesh(stickGeo, stickMat);
        scene.add(this._stick);

        // Stick handle (small sphere on top)
        var handleGeo = new THREE.SphereGeometry(0.012, 8, 8);
        var handleMat = new THREE.MeshBasicMaterial({
            color: 0xd4af37, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._handle = new THREE.Mesh(handleGeo, handleMat);
        scene.add(this._handle);

        // Footstep rings (proper, measured)
        this._footsteps = [];
        var stepGeo = new THREE.RingGeometry(0.015, 0.03, 12);
        for (var i = 0; i < 10; i++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0xc4a060, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            var step = new THREE.Mesh(stepGeo, sMat);
            step.rotation.x = -Math.PI / 2;
            step.visible = false;
            scene.add(step);
            this._footsteps.push({ mesh: step, life: 0, maxLife: 0, scale: 0 });
        }
        this._stepIdx = 0;

        // Victorian gas lamp glow (warm spheres)
        this._lamps = [];
        var lampGeo = new THREE.SphereGeometry(0.03, 8, 8);
        for (var j = 0; j < 3; j++) {
            var lMat = new THREE.MeshBasicMaterial({
                color: 0xffcc66, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var lamp = new THREE.Mesh(lampGeo, lMat);
            lamp.position.set(
                this._origPos.x + (j - 1) * 0.5,
                this._origPos.y + 0.5,
                -0.15
            );
            lamp.visible = false;
            scene.add(lamp);
            this._lamps.push({ mesh: lamp });
        }

        // Lamp posts (thin lines)
        this._posts = [];
        var postGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.5, 4);
        for (var p = 0; p < 3; p++) {
            var pMat = new THREE.MeshBasicMaterial({
                color: 0x4a3a28, transparent: true, opacity: 0,
                depthWrite: false
            });
            var post = new THREE.Mesh(postGeo, pMat);
            post.position.set(
                this._origPos.x + (p - 1) * 0.5,
                this._origPos.y + 0.25,
                -0.15
            );
            post.visible = false;
            scene.add(post);
            this._posts.push({ mesh: post });
        }

        // Cobblestone hint (floor pattern)
        var floorGeo = new THREE.PlaneGeometry(1.2, 0.3);
        var floorMat = new THREE.MeshBasicMaterial({
            color: 0x6b5b47, transparent: true, opacity: 0,
            depthWrite: false, side: THREE.DoubleSide
        });
        this._floor = new THREE.Mesh(floorGeo, floorMat);
        this._floor.rotation.x = -Math.PI / 2;
        this._floor.position.set(this._origPos.x, this._origPos.y - 0.2, 0);
        scene.add(this._floor);

        this._lastStep = 0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        // Measured walking pace
        var walkSpeed = 2.8;
        var stepCycle = Math.sin(time * walkSpeed);
        var headY = orig.y + 0.22;
        var hatY = headY + 0.04;

        if (progress < 0.08) {
            // Scene appears: lamps, floor, hat and stick
            var t = progress / 0.08;
            this._floor.material.opacity = t * 0.15;

            for (var li = 0; li < this._lamps.length; li++) {
                this._lamps[li].mesh.visible = true;
                this._lamps[li].mesh.material.opacity = t * 0.25;
                this._posts[li].mesh.visible = true;
                this._posts[li].mesh.material.opacity = t * 0.3;
            }

            this._hat.material.opacity = t * 0.8;
            this._brim.material.opacity = t * 0.8;
            this._hat.position.set(orig.x, hatY, 0);
            this._brim.position.set(orig.x, headY + 0.005, 0);

            this._stick.material.opacity = t * 0.7;
            this._handle.material.opacity = t * 0.5;
            this._stick.position.set(orig.x + 0.12, orig.y + 0.02, 0.03);
            this._handle.position.set(orig.x + 0.12, orig.y + 0.19, 0.03);

            model.position.set(orig.x, orig.y, orig.z);
        } else if (progress < 0.30) {
            // Begin dignified walk to the right
            var t2 = (progress - 0.08) / 0.22;
            var walkX = orig.x - 0.3 + t2 * 0.6;
            var dignifiedBob = Math.abs(stepCycle) * 0.01;

            model.position.set(walkX, orig.y + dignifiedBob, orig.z);
            model.rotation.z = 0; // Very upright posture
            model.scale.setScalar(gs);

            // Hat follows
            this._hat.position.set(walkX, hatY + dignifiedBob, 0);
            this._brim.position.set(walkX, headY + 0.005 + dignifiedBob, 0);

            // Stick swings slightly with walk
            var stickSwing = stepCycle * 0.08;
            this._stick.position.set(walkX + 0.12, orig.y + 0.02 + dignifiedBob, 0.03);
            this._stick.rotation.z = stickSwing;
            this._handle.position.set(
                walkX + 0.12 + Math.sin(stickSwing) * 0.15,
                orig.y + 0.19 + dignifiedBob,
                0.03
            );

            // Measured footsteps
            if (stepCycle < -0.8 && time - this._lastStep > 0.4) {
                var fs = this._footsteps[this._stepIdx % this._footsteps.length];
                this._stepIdx++;
                fs.mesh.visible = true;
                fs.mesh.position.set(walkX, orig.y - 0.19, 0);
                fs.scale = 0.3;
                fs.life = 2.0;
                fs.maxLife = 2.0;
                fs.mesh.material.opacity = 0.35;
                this._lastStep = time;
            }

            // Lamps glow pulse
            for (var li2 = 0; li2 < this._lamps.length; li2++) {
                this._lamps[li2].mesh.material.opacity = 0.25 + Math.sin(time * 1.5 + li2) * 0.05;
            }
        } else if (progress < 0.55) {
            // Continue walk in other direction
            var t3 = (progress - 0.30) / 0.25;
            var walkX2 = orig.x + 0.3 - t3 * 0.6;
            var dignifiedBob2 = Math.abs(stepCycle) * 0.01;

            model.position.set(walkX2, orig.y + dignifiedBob2, orig.z);
            model.scale.setScalar(gs);

            this._hat.position.set(walkX2, hatY + dignifiedBob2, 0);
            this._brim.position.set(walkX2, headY + 0.005 + dignifiedBob2, 0);

            var stickSwing2 = stepCycle * 0.08;
            this._stick.position.set(walkX2 + 0.12, orig.y + 0.02 + dignifiedBob2, 0.03);
            this._stick.rotation.z = stickSwing2;
            this._handle.position.set(
                walkX2 + 0.12 + Math.sin(stickSwing2) * 0.15,
                orig.y + 0.19 + dignifiedBob2,
                0.03
            );

            if (stepCycle < -0.8 && time - this._lastStep > 0.4) {
                var fs2 = this._footsteps[this._stepIdx % this._footsteps.length];
                this._stepIdx++;
                fs2.mesh.visible = true;
                fs2.mesh.position.set(walkX2, orig.y - 0.19, 0);
                fs2.scale = 0.3;
                fs2.life = 2.0;
                fs2.maxLife = 2.0;
                fs2.mesh.material.opacity = 0.35;
                this._lastStep = time;
            }

            for (var li3 = 0; li3 < this._lamps.length; li3++) {
                this._lamps[li3].mesh.material.opacity = 0.25 + Math.sin(time * 1.5 + li3) * 0.05;
            }
        } else if (progress < 0.68) {
            // Pause, tip hat (dignified greeting)
            var t4 = (progress - 0.55) / 0.13;
            model.position.set(orig.x - 0.3, orig.y, orig.z);
            model.scale.setScalar(gs);

            // Hat tip animation
            var tipAngle = Math.sin(t4 * Math.PI) * 0.2;
            var tipLift = Math.sin(t4 * Math.PI) * 0.03;
            this._hat.position.set(orig.x - 0.3, hatY + tipLift, 0);
            this._hat.rotation.z = tipAngle;
            this._brim.position.set(orig.x - 0.3, headY + 0.005 + tipLift, 0);
            this._brim.rotation.z = tipAngle;

            // Slight bow
            model.rotation.z = Math.sin(t4 * Math.PI) * 0.05;

            this._stick.position.set(orig.x - 0.3 + 0.12, orig.y + 0.02, 0.03);
            this._stick.rotation.z = 0;
            this._handle.position.set(orig.x - 0.3 + 0.12, orig.y + 0.19, 0.03);
        } else if (progress < 0.88) {
            // Final measured walk back to center
            var t5 = (progress - 0.68) / 0.20;
            var returnX = orig.x - 0.3 + t5 * 0.3;
            var dignifiedBob3 = Math.abs(Math.sin(time * walkSpeed)) * 0.01;

            model.position.set(returnX, orig.y + dignifiedBob3, orig.z);
            model.rotation.z = 0;
            model.scale.setScalar(gs);

            this._hat.position.set(returnX, hatY + dignifiedBob3, 0);
            this._hat.rotation.z = 0;
            this._brim.position.set(returnX, headY + 0.005 + dignifiedBob3, 0);
            this._brim.rotation.z = 0;

            var stickSwing3 = Math.sin(time * walkSpeed) * 0.06;
            this._stick.position.set(returnX + 0.12, orig.y + 0.02 + dignifiedBob3, 0.03);
            this._stick.rotation.z = stickSwing3;
            this._handle.position.set(
                returnX + 0.12 + Math.sin(stickSwing3) * 0.15,
                orig.y + 0.19 + dignifiedBob3,
                0.03
            );

            if (Math.sin(time * walkSpeed) < -0.8 && time - this._lastStep > 0.4) {
                var fs3 = this._footsteps[this._stepIdx % this._footsteps.length];
                this._stepIdx++;
                fs3.mesh.visible = true;
                fs3.mesh.position.set(returnX, orig.y - 0.19, 0);
                fs3.scale = 0.3;
                fs3.life = 2.0;
                fs3.maxLife = 2.0;
                fs3.mesh.material.opacity = 0.35;
                this._lastStep = time;
            }
        } else {
            // Everything fades
            var t6 = (progress - 0.88) / 0.12;
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            this._hat.material.opacity = 0.8 * (1 - t6);
            this._brim.material.opacity = 0.8 * (1 - t6);
            this._stick.material.opacity = 0.7 * (1 - t6);
            this._handle.material.opacity = 0.5 * (1 - t6);
            this._floor.material.opacity = 0.15 * (1 - t6);

            for (var li4 = 0; li4 < this._lamps.length; li4++) {
                this._lamps[li4].mesh.material.opacity = 0.25 * (1 - t6);
                this._posts[li4].mesh.material.opacity = 0.3 * (1 - t6);
            }
        }

        // Update footstep rings
        for (var fi = 0; fi < this._footsteps.length; fi++) {
            var fp = this._footsteps[fi];
            if (fp.life <= 0) continue;
            fp.life -= delta;
            if (fp.life <= 0) { fp.mesh.visible = false; continue; }
            fp.scale += delta * 0.5;
            fp.mesh.scale.setScalar(fp.scale);
            fp.mesh.material.opacity = 0.35 * (fp.life / fp.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._hat) {
            scene.remove(this._hat);
            this._hat.geometry.dispose();
            this._hat.material.dispose();
        }
        if (this._brim) {
            scene.remove(this._brim);
            this._brim.geometry.dispose();
            this._brim.material.dispose();
        }
        if (this._stick) {
            scene.remove(this._stick);
            this._stick.geometry.dispose();
            this._stick.material.dispose();
        }
        if (this._handle) {
            scene.remove(this._handle);
            this._handle.geometry.dispose();
            this._handle.material.dispose();
        }
        if (this._footsteps) {
            this._footsteps.forEach(function(f) {
                scene.remove(f.mesh);
                f.mesh.geometry.dispose();
                f.mesh.material.dispose();
            });
        }
        if (this._lamps) {
            this._lamps.forEach(function(l) {
                scene.remove(l.mesh);
                l.mesh.geometry.dispose();
                l.mesh.material.dispose();
            });
        }
        if (this._posts) {
            this._posts.forEach(function(p) {
                scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
            });
        }
        if (this._floor) {
            scene.remove(this._floor);
            this._floor.geometry.dispose();
            this._floor.material.dispose();
        }
        this._hat = this._brim = this._stick = this._handle = this._footsteps = this._lamps = this._posts = this._floor = null;
    }
};
