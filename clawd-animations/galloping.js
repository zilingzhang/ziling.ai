export default {
    name: 'Galloping',
    label: 'galloping',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Hoofbeat dust clouds
        this._dust = [];
        var dustGeo = new THREE.SphereGeometry(0.03, 6, 6);
        for (var i = 0; i < 30; i++) {
            var dColors = [0xc4a882, 0xb89b73, 0xd4b896, 0xa88b6a, 0xcbb594];
            var dMat = new THREE.MeshBasicMaterial({
                color: dColors[i % dColors.length], transparent: true, opacity: 0,
                depthWrite: false
            });
            var dust = new THREE.Mesh(dustGeo, dMat);
            dust.visible = false;
            scene.add(dust);
            this._dust.push({ mesh: dust, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0, grow: 0 });
        }
        this._dustIdx = 0;

        // Speed lines trailing behind
        this._speedLines = [];
        var lineGeo = new THREE.BoxGeometry(0.3, 0.004, 0.003);
        for (var j = 0; j < 10; j++) {
            var lMat = new THREE.MeshBasicMaterial({
                color: j % 2 === 0 ? 0xffeedd : 0xddccbb, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var line = new THREE.Mesh(lineGeo, lMat);
            line.visible = false;
            scene.add(line);
            this._speedLines.push({ mesh: line, life: 0, maxLife: 0, vx: 0 });
        }
        this._lineIdx = 0;

        // Ground shake indicator (horizontal line)
        var shakeGeo = new THREE.BoxGeometry(1.2, 0.003, 0.003);
        var shakeMat = new THREE.MeshBasicMaterial({
            color: 0x8b7355, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._groundLine = new THREE.Mesh(shakeGeo, shakeMat);
        this._groundLine.position.set(this._origPos.x, this._origPos.y - 0.2, 0);
        scene.add(this._groundLine);

        // Ground impact rings
        this._impactRings = [];
        var impGeo = new THREE.RingGeometry(0.02, 0.04, 12);
        for (var k = 0; k < 6; k++) {
            var impMat = new THREE.MeshBasicMaterial({
                color: 0xc4a882, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            var imp = new THREE.Mesh(impGeo, impMat);
            imp.rotation.x = -Math.PI / 2;
            imp.visible = false;
            scene.add(imp);
            this._impactRings.push({ mesh: imp, life: 0, maxLife: 0, scale: 1 });
        }
        this._impactIdx = 0;

        this._lastDust = 0;
        this._lastLine = 0;
        this._lastImpact = 0;
        this._gallopSpeed = 1.0;
    },
    _emitDust(x, y, intensity) {
        var count = Math.floor(2 + intensity * 3);
        for (var i = 0; i < count; i++) {
            var d = this._dust[this._dustIdx % this._dust.length];
            this._dustIdx++;
            d.mesh.visible = true;
            d.mesh.position.set(x + (Math.random() - 0.5) * 0.08, y - 0.15, (Math.random() - 0.5) * 0.1);
            d.vx = -(0.3 + Math.random() * 0.8) * intensity;
            d.vy = 0.2 + Math.random() * 0.5 * intensity;
            d.vz = (Math.random() - 0.5) * 0.2;
            d.life = 0.5 + Math.random() * 0.5;
            d.maxLife = d.life;
            d.mesh.material.opacity = 0.6;
            d.mesh.scale.setScalar(0.4 + Math.random() * 0.6);
            d.grow = 1.5 + Math.random() * 2.0;
        }
    },
    _emitImpact(x, y) {
        var imp = this._impactRings[this._impactIdx % this._impactRings.length];
        this._impactIdx++;
        imp.mesh.visible = true;
        imp.mesh.position.set(x, y - 0.19, 0);
        imp.scale = 0.5;
        imp.mesh.scale.setScalar(imp.scale);
        imp.life = 0.4;
        imp.maxLife = 0.4;
        imp.mesh.material.opacity = 0.6;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        // 4-beat gallop pattern
        var gallopFreq = 6 + progress * 12; // speeds up
        var gallopPhase = (time * gallopFreq) % 4.0;
        var isStrike = gallopPhase < 0.3;

        if (progress < 0.08) {
            // Lean forward into gallop stance
            var t = progress / 0.08;
            model.position.set(orig.x, orig.y, orig.z);
            model.rotation.z = -t * 0.12;
            model.scale.set(gs * (1 + t * 0.06), gs * (1 - t * 0.04), gs);
            this._groundLine.material.opacity = t * 0.3;
        } else if (progress < 0.45) {
            // Galloping forward: rhythmic up-down with ground strikes
            var t2 = (progress - 0.08) / 0.37;
            this._gallopSpeed = 1.0 + t2 * 1.5;

            // Forward lean increases with speed
            model.rotation.z = -(0.12 + t2 * 0.08);

            // Gallop bounce: asymmetric 4-beat
            var bounceH;
            if (gallopPhase < 1.0) {
                bounceH = Math.sin(gallopPhase * Math.PI) * 0.12;
            } else if (gallopPhase < 2.0) {
                bounceH = Math.sin((gallopPhase - 1.0) * Math.PI) * 0.08;
            } else if (gallopPhase < 3.0) {
                bounceH = Math.sin((gallopPhase - 2.0) * Math.PI) * 0.12;
            } else {
                bounceH = Math.sin((gallopPhase - 3.0) * Math.PI) * 0.06;
            }

            var moveX = orig.x + Math.sin(t2 * Math.PI * 2) * 0.4;
            model.position.set(moveX, orig.y + bounceH, orig.z);

            // Squash on strikes
            if (isStrike) {
                model.scale.set(gs * 1.08, gs * 0.88, gs);
                // Ground shake
                this._groundLine.position.y = orig.y - 0.2 + (Math.random() - 0.5) * 0.01;
            } else {
                model.scale.set(gs * 0.94, gs * 1.06, gs);
                this._groundLine.position.y = orig.y - 0.2;
            }

            // Dust on hoofstrikes
            if (isStrike && time - this._lastDust > 0.1) {
                this._emitDust(moveX, orig.y, this._gallopSpeed * 0.5);
                this._emitImpact(moveX, orig.y);
                this._lastDust = time;
            }

            // Speed lines
            if (time - this._lastLine > 0.06 && t2 > 0.2) {
                var sl = this._speedLines[this._lineIdx % this._speedLines.length];
                this._lineIdx++;
                sl.mesh.visible = true;
                sl.mesh.position.set(moveX - 0.2, orig.y + (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.05);
                sl.mesh.scale.set(0.5 + this._gallopSpeed * 0.5, 1, 1);
                sl.vx = -2 * this._gallopSpeed;
                sl.life = 0.2;
                sl.maxLife = 0.2;
                sl.mesh.material.opacity = 0.5;
                this._lastLine = time;
            }

            this._groundLine.material.opacity = 0.3 + (isStrike ? 0.2 : 0);
        } else if (progress < 0.75) {
            // Full speed gallop (faster and faster)
            var t3 = (progress - 0.45) / 0.30;
            this._gallopSpeed = 2.5 + t3 * 2.0;

            model.rotation.z = -(0.2 + t3 * 0.05);

            var fastPhase = (time * (8 + t3 * 10)) % 4.0;
            var fastStrike = fastPhase < 0.25;
            var fastBounce;
            if (fastPhase < 1.0) {
                fastBounce = Math.sin(fastPhase * Math.PI) * 0.15;
            } else if (fastPhase < 2.0) {
                fastBounce = Math.sin((fastPhase - 1.0) * Math.PI) * 0.1;
            } else if (fastPhase < 3.0) {
                fastBounce = Math.sin((fastPhase - 2.0) * Math.PI) * 0.15;
            } else {
                fastBounce = Math.sin((fastPhase - 3.0) * Math.PI) * 0.08;
            }

            var fastX = orig.x + Math.sin(t3 * Math.PI * 3) * 0.5;
            model.position.set(fastX, orig.y + fastBounce, orig.z);

            if (fastStrike) {
                model.scale.set(gs * 1.1, gs * 0.85, gs);
                this._groundLine.position.y = orig.y - 0.2 + (Math.random() - 0.5) * 0.015;
            } else {
                model.scale.set(gs * 0.92, gs * 1.08, gs);
                this._groundLine.position.y = orig.y - 0.2;
            }

            // Heavy dust
            if (fastStrike && time - this._lastDust > 0.06) {
                this._emitDust(fastX, orig.y, 1.5);
                this._emitImpact(fastX, orig.y);
                this._lastDust = time;
            }

            // Dense speed lines
            if (time - this._lastLine > 0.03) {
                var sl2 = this._speedLines[this._lineIdx % this._speedLines.length];
                this._lineIdx++;
                sl2.mesh.visible = true;
                sl2.mesh.position.set(fastX - 0.25, orig.y + (Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.05);
                sl2.mesh.scale.set(1.0 + Math.random() * 2.0, 1, 1);
                sl2.vx = -3 - Math.random() * 2;
                sl2.life = 0.15;
                sl2.maxLife = 0.15;
                sl2.mesh.material.opacity = 0.6;
                this._lastLine = time;
            }

            this._groundLine.material.opacity = 0.3 + (fastStrike ? 0.3 : 0);
        } else {
            // Deceleration and settle
            var t4 = (progress - 0.75) / 0.25;
            var decelSpeed = (1 - t4);
            var decelBounce = Math.abs(Math.sin(time * (6 * decelSpeed + 2))) * 0.08 * decelSpeed;

            model.position.set(orig.x, orig.y + decelBounce, orig.z);
            model.rotation.z = -0.2 * decelSpeed;
            model.scale.set(
                gs * (1 + decelBounce * 0.3),
                gs * (1 - decelBounce * 0.2),
                gs
            );

            this._groundLine.material.opacity = 0.3 * (1 - t4);

            if (t4 > 0.7) {
                model.position.copy(orig);
                model.rotation.z = 0;
                model.scale.copy(this._origScale);
            }
        }

        // Update dust particles
        for (var di = 0; di < this._dust.length; di++) {
            var dp = this._dust[di];
            if (dp.life <= 0) continue;
            dp.life -= delta;
            if (dp.life <= 0) { dp.mesh.visible = false; continue; }
            dp.mesh.position.x += dp.vx * delta;
            dp.mesh.position.y += dp.vy * delta;
            dp.mesh.position.z += dp.vz * delta;
            dp.vy -= 0.8 * delta;
            var cs = dp.mesh.scale.x;
            dp.mesh.scale.setScalar(cs + dp.grow * delta);
            dp.mesh.material.opacity = 0.6 * (dp.life / dp.maxLife);
        }

        // Update speed lines
        for (var li = 0; li < this._speedLines.length; li++) {
            var sline = this._speedLines[li];
            if (sline.life <= 0) continue;
            sline.life -= delta;
            if (sline.life <= 0) { sline.mesh.visible = false; continue; }
            sline.mesh.position.x += sline.vx * delta;
            sline.mesh.material.opacity = 0.5 * (sline.life / sline.maxLife);
        }

        // Update impact rings
        for (var ii = 0; ii < this._impactRings.length; ii++) {
            var ir = this._impactRings[ii];
            if (ir.life <= 0) continue;
            ir.life -= delta;
            if (ir.life <= 0) { ir.mesh.visible = false; continue; }
            ir.scale += delta * 3;
            ir.mesh.scale.setScalar(ir.scale);
            ir.mesh.material.opacity = 0.6 * (ir.life / ir.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._dust) {
            this._dust.forEach(function(d) {
                scene.remove(d.mesh);
                d.mesh.geometry.dispose();
                d.mesh.material.dispose();
            });
        }
        if (this._speedLines) {
            this._speedLines.forEach(function(l) {
                scene.remove(l.mesh);
                l.mesh.geometry.dispose();
                l.mesh.material.dispose();
            });
        }
        if (this._groundLine) {
            scene.remove(this._groundLine);
            this._groundLine.geometry.dispose();
            this._groundLine.material.dispose();
        }
        if (this._impactRings) {
            this._impactRings.forEach(function(r) {
                scene.remove(r.mesh);
                r.mesh.geometry.dispose();
                r.mesh.material.dispose();
            });
        }
        this._dust = this._speedLines = this._groundLine = this._impactRings = null;
    }
};
