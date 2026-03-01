export default {
    name: 'Computing',
    label: 'computing',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // CPU core (wireframe box)
        var cpuGeo = new THREE.BoxGeometry(0.25, 0.25, 0.08);
        var cpuMat = new THREE.MeshBasicMaterial({
            color: 0x22ff88, transparent: true, opacity: 0,
            wireframe: true, depthWrite: false
        });
        this._cpu = new THREE.Mesh(cpuGeo, cpuMat);
        this._cpu.position.set(ox, oy - 0.15, 0);
        scene.add(this._cpu);

        // CPU inner glow
        var cpuGlowGeo = new THREE.BoxGeometry(0.2, 0.2, 0.06);
        var cpuGlowMat = new THREE.MeshBasicMaterial({
            color: 0x22ff88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._cpuGlow = new THREE.Mesh(cpuGlowGeo, cpuGlowMat);
        this._cpuGlow.position.set(ox, oy - 0.15, 0);
        scene.add(this._cpuGlow);

        // Binary rain particles (0s and 1s as tiny cubes)
        this._binaryRain = [];
        var binGeo = new THREE.BoxGeometry(0.025, 0.025, 0.01);
        for (var i = 0; i < 45; i++) {
            var binMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0x22ff88 : (i % 3 === 1 ? 0x00cc66 : 0x44ffaa),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bin = new THREE.Mesh(binGeo, binMat);
            bin.visible = false;
            scene.add(bin);
            this._binaryRain.push({
                mesh: bin,
                col: (i % 10) - 5,
                speed: 0.8 + Math.random() * 1.2,
                isOne: Math.random() > 0.5,
                delay: Math.random() * 2
            });
        }

        // Input stream particles (left side)
        this._inputs = [];
        var inGeo = new THREE.BoxGeometry(0.03, 0.03, 0.02);
        for (var j = 0; j < 15; j++) {
            var inMat = new THREE.MeshBasicMaterial({
                color: 0x44aaff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var inp = new THREE.Mesh(inGeo, inMat);
            inp.visible = false;
            scene.add(inp);
            this._inputs.push({
                mesh: inp, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._inIdx = 0;

        // Output stream particles (right side)
        this._outputs = [];
        var outGeo = new THREE.BoxGeometry(0.03, 0.03, 0.02);
        for (var k = 0; k < 15; k++) {
            var outMat = new THREE.MeshBasicMaterial({
                color: 0x88ff44, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var outp = new THREE.Mesh(outGeo, outMat);
            outp.visible = false;
            scene.add(outp);
            this._outputs.push({
                mesh: outp, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._outIdx = 0;

        // Register particles (shuffle inside CPU)
        this._registers = [];
        var regGeo = new THREE.BoxGeometry(0.02, 0.02, 0.02);
        for (var r = 0; r < 12; r++) {
            var regMat = new THREE.MeshBasicMaterial({
                color: r % 2 === 0 ? 0x22ff88 : 0x88ffcc,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var reg = new THREE.Mesh(regGeo, regMat);
            reg.visible = false;
            scene.add(reg);
            this._registers.push({
                mesh: reg, angle: (r / 12) * Math.PI * 2,
                radius: 0.05 + (r % 3) * 0.03,
                speed: 2 + r * 0.3
            });
        }

        // Heat particles (rising)
        this._heat = [];
        var heatGeo = new THREE.SphereGeometry(0.012, 4, 4);
        for (var h = 0; h < 12; h++) {
            var hMat = new THREE.MeshBasicMaterial({
                color: h % 2 === 0 ? 0xff4422 : 0xff8844,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var heat = new THREE.Mesh(heatGeo, hMat);
            heat.visible = false;
            scene.add(heat);
            this._heat.push({
                mesh: heat, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._heatIdx = 0;

        this._processingGlow = 0;
    },
    _spawnInput(ox, oy) {
        var inp = this._inputs[this._inIdx % this._inputs.length];
        this._inIdx++;
        inp.mesh.visible = true;
        inp.mesh.position.set(ox - 0.6, oy - 0.15 + (Math.random() - 0.5) * 0.15, 0);
        inp.vx = 1.5 + Math.random() * 0.5;
        inp.vy = (Math.random() - 0.5) * 0.2;
        inp.life = 0.4 + Math.random() * 0.2;
        inp.maxLife = inp.life;
        inp.mesh.material.opacity = 0.8;
    },
    _spawnOutput(ox, oy) {
        var outp = this._outputs[this._outIdx % this._outputs.length];
        this._outIdx++;
        outp.mesh.visible = true;
        outp.mesh.position.set(ox + 0.15, oy - 0.15 + (Math.random() - 0.5) * 0.1, 0);
        outp.vx = 1.2 + Math.random() * 0.8;
        outp.vy = (Math.random() - 0.5) * 0.15;
        outp.life = 0.5 + Math.random() * 0.2;
        outp.maxLife = outp.life;
        outp.mesh.material.opacity = 0.8;
    },
    _spawnHeat(ox, oy) {
        var h = this._heat[this._heatIdx % this._heat.length];
        this._heatIdx++;
        h.mesh.visible = true;
        h.mesh.position.set(ox + (Math.random() - 0.5) * 0.15, oy - 0.05, 0);
        h.vx = (Math.random() - 0.5) * 0.2;
        h.vy = 0.5 + Math.random() * 0.3;
        h.life = 0.5 + Math.random() * 0.3;
        h.maxLife = h.life;
        h.mesh.material.opacity = 0.5;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.08) {
            // Phase 1: CPU appears
            var t = progress / 0.08;
            this._cpu.material.opacity = t * 0.6;
            this._cpuGlow.material.opacity = t * 0.1;
            model.position.set(ox, oy + 0.15, oz);
        } else if (progress < 0.30) {
            // Phase 2: Binary rain starts, input streams begin
            var t2 = (progress - 0.08) / 0.22;
            this._cpu.material.opacity = 0.6;

            // Binary rain
            for (var i = 0; i < this._binaryRain.length; i++) {
                var br = this._binaryRain[i];
                if (t2 < br.delay * 0.3) continue;
                br.mesh.visible = true;
                br.mesh.position.x = ox + br.col * 0.08;
                br.mesh.position.y -= br.speed * delta;
                if (br.mesh.position.y < oy - 0.8) {
                    br.mesh.position.y = oy + 0.6 + Math.random() * 0.3;
                }
                br.mesh.material.opacity = 0.3 + Math.sin(time * 5 + i) * 0.15;
                // Scale variation for 0 vs 1
                br.mesh.scale.x = br.isOne ? 0.5 : 1;
            }

            // Input stream
            if (Math.random() < 0.1 + t2 * 0.15) {
                this._spawnInput(ox, oy);
            }

            // CPU processing glow pulses
            this._processingGlow = 0.1 + t2 * 0.1;
            this._cpuGlow.material.opacity = this._processingGlow + Math.sin(time * 8) * 0.05;

            model.position.set(ox, oy + 0.15 + Math.sin(time * 3) * 0.005, oz);
        } else if (progress < 0.70) {
            // Phase 3: Full processing, registers shuffle, outputs flow
            var t3 = (progress - 0.30) / 0.40;

            // Binary rain continues
            for (var j = 0; j < this._binaryRain.length; j++) {
                var br2 = this._binaryRain[j];
                br2.mesh.visible = true;
                br2.mesh.position.y -= br2.speed * delta;
                if (br2.mesh.position.y < oy - 0.8) {
                    br2.mesh.position.y = oy + 0.6;
                }
                br2.mesh.material.opacity = 0.3 + Math.sin(time * 5 + j) * 0.15;
            }

            // Input and output streams
            if (Math.random() < 0.15) {
                this._spawnInput(ox, oy);
            }
            if (Math.random() < 0.1 + t3 * 0.1) {
                this._spawnOutput(ox, oy);
            }

            // Register particles orbit inside CPU
            for (var r = 0; r < this._registers.length; r++) {
                var reg = this._registers[r];
                reg.mesh.visible = true;
                var a = reg.angle + time * reg.speed;
                reg.mesh.position.set(
                    ox + Math.cos(a) * reg.radius,
                    oy - 0.15 + Math.sin(a) * reg.radius,
                    0.02
                );
                reg.mesh.material.opacity = 0.5 + Math.sin(time * 10 + r) * 0.2;
                reg.mesh.rotation.z += delta * 4;
            }

            // Heat rises
            if (Math.random() < 0.05 + t3 * 0.08) {
                this._spawnHeat(ox, oy);
            }

            // CPU glow intensifies
            this._processingGlow = 0.2 + t3 * 0.2;
            this._cpuGlow.material.opacity = this._processingGlow + Math.sin(time * 8) * 0.08;
            this._cpu.rotation.z = Math.sin(time * 2) * 0.02;

            model.position.set(ox, oy + 0.15 + Math.sin(time * 3) * 0.008, oz);
        } else if (progress < 0.88) {
            // Phase 4: Result compilation, glow burst
            var t4 = (progress - 0.70) / 0.18;
            var burstEase = Math.sin(t4 * Math.PI);

            // CPU flashes
            this._cpuGlow.material.opacity = 0.4 + burstEase * 0.3;
            this._cpuGlow.scale.setScalar(1 + burstEase * 0.3);
            this._cpu.material.opacity = 0.6 + burstEase * 0.3;

            // Registers converge
            for (var r2 = 0; r2 < this._registers.length; r2++) {
                var reg2 = this._registers[r2];
                var shrink = 1 - t4 * 0.8;
                var a2 = reg2.angle + time * reg2.speed * 1.5;
                reg2.mesh.position.set(
                    ox + Math.cos(a2) * reg2.radius * shrink,
                    oy - 0.15 + Math.sin(a2) * reg2.radius * shrink,
                    0.02
                );
                reg2.mesh.material.opacity = 0.7 * (1 - t4 * 0.5);
            }

            // Output burst
            if (Math.random() < 0.2) {
                this._spawnOutput(ox, oy);
            }

            // Binary rain fades
            for (var k = 0; k < this._binaryRain.length; k++) {
                this._binaryRain[k].mesh.material.opacity *= 0.98;
            }

            model.position.set(ox, oy + 0.15, oz);
        } else {
            // Phase 5: Settle
            var t5 = (progress - 0.88) / 0.12;
            this._cpu.material.opacity = 0.6 * (1 - t5);
            this._cpuGlow.material.opacity = 0.4 * (1 - t5);

            for (var m = 0; m < this._binaryRain.length; m++) {
                this._binaryRain[m].mesh.material.opacity *= 0.92;
                if (this._binaryRain[m].mesh.material.opacity < 0.01) {
                    this._binaryRain[m].mesh.visible = false;
                }
            }
            for (var n = 0; n < this._registers.length; n++) {
                this._registers[n].mesh.material.opacity *= 0.9;
            }

            model.position.set(ox, oy + 0.15 * (1 - t5), oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update inputs
        for (var ii = 0; ii < this._inputs.length; ii++) {
            var ip = this._inputs[ii];
            if (ip.life <= 0) continue;
            ip.life -= delta;
            if (ip.life <= 0) { ip.mesh.visible = false; continue; }
            ip.mesh.position.x += ip.vx * delta;
            ip.mesh.position.y += ip.vy * delta;
            var ilr = ip.life / ip.maxLife;
            ip.mesh.material.opacity = ilr * 0.7;
            ip.mesh.rotation.z += delta * 3;
        }

        // Update outputs
        for (var oi = 0; oi < this._outputs.length; oi++) {
            var op = this._outputs[oi];
            if (op.life <= 0) continue;
            op.life -= delta;
            if (op.life <= 0) { op.mesh.visible = false; continue; }
            op.mesh.position.x += op.vx * delta;
            op.mesh.position.y += op.vy * delta;
            var olr = op.life / op.maxLife;
            op.mesh.material.opacity = olr * 0.7;
            op.mesh.rotation.z += delta * 2;
        }

        // Update heat
        for (var hi = 0; hi < this._heat.length; hi++) {
            var hp = this._heat[hi];
            if (hp.life <= 0) continue;
            hp.life -= delta;
            if (hp.life <= 0) { hp.mesh.visible = false; continue; }
            hp.mesh.position.x += hp.vx * delta;
            hp.mesh.position.y += hp.vy * delta;
            hp.mesh.position.x += Math.sin(time * 6 + hi * 2) * 0.003;
            var hlr = hp.life / hp.maxLife;
            hp.mesh.material.opacity = hlr * 0.4;
            hp.mesh.scale.setScalar(0.8 + (1 - hlr) * 1.2);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._cpu) { scene.remove(this._cpu); this._cpu.geometry.dispose(); this._cpu.material.dispose(); }
        if (this._cpuGlow) { scene.remove(this._cpuGlow); this._cpuGlow.geometry.dispose(); this._cpuGlow.material.dispose(); }
        if (this._binaryRain) { this._binaryRain.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); }); }
        if (this._inputs) { this._inputs.forEach(function(i) { scene.remove(i.mesh); i.mesh.geometry.dispose(); i.mesh.material.dispose(); }); }
        if (this._outputs) { this._outputs.forEach(function(o) { scene.remove(o.mesh); o.mesh.geometry.dispose(); o.mesh.material.dispose(); }); }
        if (this._registers) { this._registers.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); }); }
        if (this._heat) { this._heat.forEach(function(h) { scene.remove(h.mesh); h.mesh.geometry.dispose(); h.mesh.material.dispose(); }); }
        this._cpu = this._cpuGlow = this._binaryRain = this._inputs = this._outputs = this._registers = this._heat = null;
    }
};
