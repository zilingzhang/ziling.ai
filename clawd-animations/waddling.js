export default {
    name: 'Waddling',
    label: 'waddling',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Ice sparkle particles underfoot
        this._iceSparkles = [];
        var iceGeo = new THREE.SphereGeometry(0.006, 4, 4);
        for (var i = 0; i < 25; i++) {
            var iColors = [0xcceeFF, 0xaaddff, 0xeeffff, 0x88ccff, 0xffffff];
            var iMat = new THREE.MeshBasicMaterial({
                color: iColors[i % iColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ice = new THREE.Mesh(iceGeo, iMat);
            ice.visible = false;
            scene.add(ice);
            this._iceSparkles.push({ mesh: ice, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._iceIdx = 0;

        // Ice floor surface
        var floorGeo = new THREE.CircleGeometry(0.6, 24);
        var floorMat = new THREE.MeshBasicMaterial({
            color: 0xaaddff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this._iceFloor = new THREE.Mesh(floorGeo, floorMat);
        this._iceFloor.rotation.x = -Math.PI / 2;
        this._iceFloor.position.set(this._origPos.x, this._origPos.y - 0.2, 0);
        scene.add(this._iceFloor);

        // Slide trail (for belly slide)
        this._slideTrail = [];
        var slideGeo = new THREE.BoxGeometry(0.06, 0.003, 0.02);
        for (var j = 0; j < 10; j++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0xcceeFF, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var slide = new THREE.Mesh(slideGeo, sMat);
            slide.visible = false;
            scene.add(slide);
            this._slideTrail.push({ mesh: slide, age: 99 });
        }
        this._slideIdx = 0;

        // Waddle step footprints (small ovals)
        this._steps = [];
        var stepGeo = new THREE.CircleGeometry(0.015, 8);
        for (var k = 0; k < 12; k++) {
            var stMat = new THREE.MeshBasicMaterial({
                color: 0x88bbdd, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            var step = new THREE.Mesh(stepGeo, stMat);
            step.rotation.x = -Math.PI / 2;
            step.visible = false;
            scene.add(step);
            this._steps.push({ mesh: step, life: 0, maxLife: 0 });
        }
        this._stepIdx = 0;

        // Snow particle flurry
        this._snow = [];
        var snowGeo = new THREE.SphereGeometry(0.005, 4, 4);
        for (var s = 0; s < 15; s++) {
            var snMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var snow = new THREE.Mesh(snowGeo, snMat);
            snow.visible = false;
            scene.add(snow);
            this._snow.push({
                mesh: snow,
                baseX: this._origPos.x + (Math.random() - 0.5) * 0.8,
                baseY: this._origPos.y + 0.3 + Math.random() * 0.4,
                phase: Math.random() * Math.PI * 2,
                speed: 0.3 + Math.random() * 0.4,
                drift: (Math.random() - 0.5) * 0.5
            });
        }

        this._lastIce = 0;
        this._lastStep = 0;
        this._isSliding = false;
    },
    _emitIce(x, y) {
        for (var i = 0; i < 3; i++) {
            var ic = this._iceSparkles[this._iceIdx % this._iceSparkles.length];
            this._iceIdx++;
            ic.mesh.visible = true;
            ic.mesh.position.set(x + (Math.random() - 0.5) * 0.08, y - 0.15, (Math.random() - 0.5) * 0.06);
            var angle = Math.random() * Math.PI * 2;
            var spd = 0.2 + Math.random() * 0.5;
            ic.vx = Math.cos(angle) * spd;
            ic.vy = 0.2 + Math.random() * 0.4;
            ic.vz = Math.sin(angle) * spd * 0.3;
            ic.life = 0.3 + Math.random() * 0.3;
            ic.maxLife = ic.life;
            ic.mesh.material.opacity = 0.7;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        // Waddle cycle
        var waddleSpeed = 4;
        var waddleSway = Math.sin(time * waddleSpeed);

        // Activate snow
        for (var si = 0; si < this._snow.length; si++) {
            var sn = this._snow[si];
            sn.mesh.visible = progress > 0.05 && progress < 0.90;
            if (sn.mesh.visible) {
                var snowFade = progress < 0.1 ? (progress - 0.05) / 0.05 : (progress > 0.85 ? (0.90 - progress) / 0.05 : 1.0);
                var snowY = sn.baseY - ((time * sn.speed) % 1.0) * 0.7;
                if (snowY < orig.y - 0.2) snowY += 0.7;
                sn.mesh.position.set(
                    sn.baseX + Math.sin(time * sn.drift + sn.phase) * 0.05,
                    snowY,
                    Math.sin(time * 0.3 + sn.phase) * 0.04
                );
                sn.mesh.material.opacity = 0.2 * Math.max(0, snowFade);
            }
        }

        if (progress < 0.06) {
            // Ice floor appears
            var t = progress / 0.06;
            this._iceFloor.material.opacity = t * 0.08;
            model.position.set(orig.x, orig.y, orig.z);
        } else if (progress < 0.15) {
            // Penguin posture: lean back, wider at base
            var t2 = (progress - 0.06) / 0.09;
            model.position.set(orig.x, orig.y, orig.z);
            // Belly-forward: slight lean back, wider base
            model.scale.set(gs * (1 + t2 * 0.08), gs * (1 - t2 * 0.03), gs);
            model.rotation.z = t2 * 0.03; // Slight lean back
            this._iceFloor.material.opacity = 0.08;
        } else if (progress < 0.45) {
            // Waddle right: rock side to side with each step
            var t3 = (progress - 0.15) / 0.30;
            var waddleX = orig.x - 0.2 + t3 * 0.5;
            var rockAngle = waddleSway * 0.12;
            var stepBob = Math.abs(waddleSway) * 0.015;

            model.position.set(waddleX + waddleSway * 0.02, orig.y + stepBob, orig.z);
            model.rotation.z = rockAngle + 0.03; // Rock + lean back
            model.scale.set(gs * 1.08, gs * 0.97, gs);

            // Ice sparkles on steps
            if (Math.abs(waddleSway) > 0.9 && time - this._lastIce > 0.2) {
                this._emitIce(waddleX, orig.y);
                this._lastIce = time;
            }

            // Footstep prints
            if (waddleSway > 0.9 && time - this._lastStep > 0.25) {
                var st = this._steps[this._stepIdx % this._steps.length];
                this._stepIdx++;
                st.mesh.visible = true;
                st.mesh.position.set(waddleX + 0.02, orig.y - 0.19, 0);
                st.life = 2.0;
                st.maxLife = 2.0;
                st.mesh.material.opacity = 0.2;
                this._lastStep = time;
            } else if (waddleSway < -0.9 && time - this._lastStep > 0.25) {
                var st2 = this._steps[this._stepIdx % this._steps.length];
                this._stepIdx++;
                st2.mesh.visible = true;
                st2.mesh.position.set(waddleX - 0.02, orig.y - 0.19, 0);
                st2.life = 2.0;
                st2.maxLife = 2.0;
                st2.mesh.material.opacity = 0.2;
                this._lastStep = time;
            }
        } else if (progress < 0.55) {
            // Belly slide! Tip forward and slide
            var t4 = (progress - 0.45) / 0.10;
            this._isSliding = true;

            // Tip forward
            var tipProgress = Math.min(t4 * 3, 1.0);
            model.rotation.z = -tipProgress * 0.4;

            // Slide forward
            var slideX = orig.x + 0.3 + t4 * 0.4;
            model.position.set(slideX, orig.y - tipProgress * 0.08, orig.z);

            // Flatten during slide
            model.scale.set(gs * (1.08 + tipProgress * 0.1), gs * (0.97 - tipProgress * 0.08), gs);

            // Slide trail
            if (time - this._lastStep > 0.04) {
                var sl = this._slideTrail[this._slideIdx % this._slideTrail.length];
                this._slideIdx++;
                sl.mesh.visible = true;
                sl.mesh.position.set(slideX, orig.y - 0.19, 0);
                sl.age = 0;
                sl.mesh.material.opacity = 0.2;
                this._lastStep = time;
            }

            // Ice spray
            if (time - this._lastIce > 0.05) {
                this._emitIce(slideX, orig.y);
                this._lastIce = time;
            }
        } else if (progress < 0.68) {
            // Continue sliding, gradually slow and recover
            var t5 = (progress - 0.55) / 0.13;
            var decel = 1 - t5;
            var slideX2 = orig.x + 0.7 + decel * 0.15;

            model.position.set(slideX2, orig.y - 0.08 * decel, orig.z);
            model.rotation.z = -0.4 * decel;
            model.scale.set(gs * (1.18 - t5 * 0.1), gs * (0.89 + t5 * 0.08), gs);

            // Slide trail
            if (decel > 0.3 && time - this._lastStep > 0.06) {
                var sl2 = this._slideTrail[this._slideIdx % this._slideTrail.length];
                this._slideIdx++;
                sl2.mesh.visible = true;
                sl2.mesh.position.set(slideX2, orig.y - 0.19, 0);
                sl2.age = 0;
                sl2.mesh.material.opacity = 0.15 * decel;
                this._lastStep = time;
            }
        } else if (progress < 0.85) {
            // Waddle back to center
            var t6 = (progress - 0.68) / 0.17;
            this._isSliding = false;
            var returnX = orig.x + 0.7 * (1 - t6);
            var returnRock = waddleSway * 0.1;
            var returnBob = Math.abs(waddleSway) * 0.012;

            model.position.set(returnX + waddleSway * 0.015, orig.y + returnBob, orig.z);
            model.rotation.z = returnRock + 0.03;
            model.scale.set(gs * 1.08, gs * 0.97, gs);

            if (Math.abs(waddleSway) > 0.9 && time - this._lastIce > 0.2) {
                this._emitIce(returnX, orig.y);
                this._lastIce = time;
            }
        } else {
            // Settle, ice fades
            var t7 = (progress - 0.85) / 0.15;
            model.position.set(orig.x, orig.y, orig.z);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            this._iceFloor.material.opacity = 0.08 * (1 - t7);
        }

        // Update ice sparkles
        for (var ii = 0; ii < this._iceSparkles.length; ii++) {
            var ip = this._iceSparkles[ii];
            if (ip.life <= 0) continue;
            ip.life -= delta;
            if (ip.life <= 0) { ip.mesh.visible = false; continue; }
            ip.mesh.position.x += ip.vx * delta;
            ip.mesh.position.y += ip.vy * delta;
            ip.mesh.position.z += ip.vz * delta;
            ip.vy -= 1.0 * delta;
            ip.mesh.material.opacity = 0.7 * (ip.life / ip.maxLife);
        }

        // Update slide trail
        for (var sti = 0; sti < this._slideTrail.length; sti++) {
            var stp = this._slideTrail[sti];
            if (!stp.mesh.visible) continue;
            stp.age += delta;
            if (stp.age > 1.5) { stp.mesh.visible = false; continue; }
            stp.mesh.material.opacity = 0.2 * Math.max(0, 1 - stp.age / 1.5);
        }

        // Update footsteps
        for (var fi = 0; fi < this._steps.length; fi++) {
            var fp = this._steps[fi];
            if (fp.life <= 0) continue;
            fp.life -= delta;
            if (fp.life <= 0) { fp.mesh.visible = false; continue; }
            fp.mesh.material.opacity = 0.2 * (fp.life / fp.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._iceSparkles) {
            this._iceSparkles.forEach(function(i) {
                scene.remove(i.mesh);
                i.mesh.geometry.dispose();
                i.mesh.material.dispose();
            });
        }
        if (this._iceFloor) {
            scene.remove(this._iceFloor);
            this._iceFloor.geometry.dispose();
            this._iceFloor.material.dispose();
        }
        if (this._slideTrail) {
            this._slideTrail.forEach(function(s) {
                scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                s.mesh.material.dispose();
            });
        }
        if (this._steps) {
            this._steps.forEach(function(s) {
                scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                s.mesh.material.dispose();
            });
        }
        if (this._snow) {
            this._snow.forEach(function(s) {
                scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                s.mesh.material.dispose();
            });
        }
        this._iceSparkles = this._iceFloor = this._slideTrail = this._steps = this._snow = null;
    }
};
