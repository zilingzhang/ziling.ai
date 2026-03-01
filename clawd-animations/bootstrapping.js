export default {
    name: 'Bootstrapping',
    label: 'bootstrapping',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // 3 energy loop tori (appear sequentially at increasing heights)
        this._loops = [];
        var loopColors = [0xff6644, 0xff8844, 0xffaa44];
        var loopHeights = [0.3, 0.7, 1.1];
        for (var i = 0; i < 3; i++) {
            var lGeo = new THREE.TorusGeometry(0.2, 0.015, 8, 24);
            var lMat = new THREE.MeshBasicMaterial({
                color: loopColors[i], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var lMesh = new THREE.Mesh(lGeo, lMat);
            lMesh.position.set(this._origPos.x, this._origPos.y + loopHeights[i], 0);
            lMesh.visible = false;
            scene.add(lMesh);
            this._loops.push({
                mesh: lMesh,
                height: loopHeights[i],
                color: loopColors[i],
                rotSpeed: 2 + i * 0.8,
                active: false
            });
        }

        // Glow lines (bootstrap strands connecting model to each loop)
        this._strands = [];
        for (var st = 0; st < 3; st++) {
            var strandPoints = [];
            var strandSegs = 10;
            for (var sp = 0; sp <= strandSegs; sp++) {
                strandPoints.push(new THREE.Vector3(0, 0, 0));
            }
            var stGeo = new THREE.BufferGeometry().setFromPoints(strandPoints);
            var stMat = new THREE.LineBasicMaterial({
                color: loopColors[st], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending
            });
            var stLine = new THREE.Line(stGeo, stMat);
            stLine.visible = false;
            scene.add(stLine);
            this._strands.push({
                line: stLine,
                segments: strandSegs,
                loopIdx: st
            });
        }

        // Pull particles (travel along loop path upward)
        this._pullParticles = [];
        var pullGeo = new THREE.SphereGeometry(0.015, 6, 6);
        for (var pp = 0; pp < 15; pp++) {
            var ppMat = new THREE.MeshBasicMaterial({
                color: pp % 3 === 0 ? 0xffaa44 : (pp % 3 === 1 ? 0xff8833 : 0xffcc66),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ppm = new THREE.Mesh(pullGeo, ppMat);
            ppm.visible = false;
            scene.add(ppm);
            this._pullParticles.push({
                mesh: ppm,
                life: 0,
                maxLife: 0.6 + Math.random() * 0.4,
                vy: 0,
                angle: Math.random() * Math.PI * 2,
                radius: 0.05 + Math.random() * 0.1,
                active: false
            });
        }
        this._pullIdx = 0;

        // Energy crackle particles at peak
        this._crackles = [];
        var crackGeo = new THREE.SphereGeometry(0.012, 4, 4);
        for (var c = 0; c < 12; c++) {
            var cMat = new THREE.MeshBasicMaterial({
                color: c % 2 === 0 ? 0xffdd44 : 0xffffff,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var cm = new THREE.Mesh(crackGeo, cMat);
            cm.visible = false;
            scene.add(cm);
            this._crackles.push({
                mesh: cm,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 0,
                maxLife: 0.3 + Math.random() * 0.2,
                active: false
            });
        }

        // Boot strap glow (aura around model during climb)
        var auraGeo = new THREE.SphereGeometry(0.25, 12, 12);
        var auraMat = new THREE.MeshBasicMaterial({
            color: 0xff8844, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._aura = new THREE.Mesh(auraGeo, auraMat);
        this._aura.position.copy(this._origPos);
        scene.add(this._aura);

        this._crackleTriggered = false;
    },
    _updateStrand(strand, fromX, fromY, toX, toY, waviness, time) {
        var positions = strand.line.geometry.attributes.position;
        var segs = strand.segments;
        for (var i = 0; i <= segs; i++) {
            var t = i / segs;
            var x = fromX + (toX - fromX) * t;
            var y = fromY + (toY - fromY) * t;
            // Add sinusoidal wave to make strand look like an energy arc
            var wave = Math.sin(t * Math.PI * 2 + time * 4) * waviness * Math.sin(t * Math.PI);
            positions.setXYZ(i, x + wave, y, 0.05);
        }
        positions.needsUpdate = true;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var modelHeight = 0; // How high model has climbed
        var activeLoops = 0;

        if (progress < 0.12) {
            // Phase 1: First energy loop extends upward
            var p = progress / 0.12;
            this._loops[0].mesh.visible = true;
            this._loops[0].active = true;
            this._loops[0].mesh.material.opacity = p * 0.6;
            this._loops[0].mesh.scale.setScalar(p);

            // Strand from model to first loop
            this._strands[0].line.visible = true;
            this._strands[0].line.material.opacity = p * 0.3;
            this._updateStrand(
                this._strands[0],
                orig.x, orig.y,
                orig.x, orig.y + this._loops[0].height * p,
                0.05, time
            );

            model.position.set(orig.x, orig.y, orig.z);
            activeLoops = 1;

        } else if (progress < 0.30) {
            // Phase 2: Model grabs and pulls up on first loop
            var p2 = (progress - 0.12) / 0.18;
            modelHeight = p2 * this._loops[0].height;
            activeLoops = 1;

            // Model climbs
            model.position.set(orig.x, orig.y + modelHeight, orig.z);

            // First loop fully visible, pulses as model grabs it
            this._loops[0].mesh.material.opacity = 0.6 + Math.sin(time * 5) * 0.1;
            this._loops[0].mesh.scale.setScalar(1 + Math.sin(time * 3) * 0.05);

            // Strand taut
            this._strands[0].line.material.opacity = 0.4;
            this._updateStrand(
                this._strands[0],
                model.position.x, model.position.y,
                orig.x, orig.y + this._loops[0].height,
                0.03 * (1 - p2), time
            );

            // Spawn pull particles going upward
            if (delta > 0) {
                var pi = this._pullIdx % this._pullParticles.length;
                var pp = this._pullParticles[pi];
                pp.mesh.visible = true;
                pp.mesh.position.set(model.position.x, model.position.y, 0);
                pp.life = pp.maxLife;
                pp.vy = 0.8 + Math.random() * 0.5;
                pp.active = true;
                this._pullIdx++;
            }

            // Effort wobble
            model.rotation.z = Math.sin(time * 8) * 0.03 * (1 - p2);

        } else if (progress < 0.48) {
            // Phase 3: Second loop from new position
            var p3 = (progress - 0.30) / 0.18;
            modelHeight = this._loops[0].height;
            activeLoops = 2;

            // Second loop appears
            this._loops[1].mesh.visible = true;
            this._loops[1].active = true;
            this._loops[1].mesh.material.opacity = p3 * 0.6;
            this._loops[1].mesh.scale.setScalar(p3);

            // Model at first loop height, starting to climb to second
            var climbP = Math.max(0, p3 - 0.4) / 0.6;
            modelHeight = this._loops[0].height + climbP * (this._loops[1].height - this._loops[0].height);
            model.position.set(orig.x, orig.y + modelHeight, orig.z);

            // Strand to second loop
            this._strands[1].line.visible = true;
            this._strands[1].line.material.opacity = p3 * 0.3;
            this._updateStrand(
                this._strands[1],
                model.position.x, model.position.y,
                orig.x, orig.y + this._loops[1].height,
                0.05 * (1 - climbP), time
            );

            // First strand relaxes
            this._strands[0].line.material.opacity = 0.2 * (1 - p3);

            // Pull particles
            if (delta > 0 && climbP > 0) {
                var pi2 = this._pullIdx % this._pullParticles.length;
                var pp2 = this._pullParticles[pi2];
                pp2.mesh.visible = true;
                pp2.mesh.position.set(model.position.x, model.position.y, 0);
                pp2.life = pp2.maxLife;
                pp2.vy = 0.8 + Math.random() * 0.5;
                pp2.active = true;
                this._pullIdx++;
            }

            model.rotation.z = Math.sin(time * 6) * 0.02;

        } else if (progress < 0.65) {
            // Phase 4: Third pull, higher still
            var p4 = (progress - 0.48) / 0.17;
            activeLoops = 3;

            // Third loop appears
            this._loops[2].mesh.visible = true;
            this._loops[2].active = true;
            this._loops[2].mesh.material.opacity = p4 * 0.6;
            this._loops[2].mesh.scale.setScalar(Math.min(1, p4 * 1.5));

            // Model climbs to third loop
            var climbP2 = Math.max(0, p4 - 0.3) / 0.7;
            modelHeight = this._loops[1].height + climbP2 * (this._loops[2].height - this._loops[1].height);
            model.position.set(orig.x, orig.y + modelHeight, orig.z);

            // Third strand
            this._strands[2].line.visible = true;
            this._strands[2].line.material.opacity = p4 * 0.3;
            this._updateStrand(
                this._strands[2],
                model.position.x, model.position.y,
                orig.x, orig.y + this._loops[2].height,
                0.05 * (1 - climbP2), time
            );

            // Previous strands fade
            this._strands[0].line.material.opacity = 0;
            this._strands[1].line.material.opacity = 0.2 * (1 - p4);

            // Pull particles
            if (delta > 0 && climbP2 > 0) {
                var pi3 = this._pullIdx % this._pullParticles.length;
                var pp3 = this._pullParticles[pi3];
                pp3.mesh.visible = true;
                pp3.mesh.position.set(model.position.x, model.position.y, 0);
                pp3.life = pp3.maxLife;
                pp3.vy = 0.8 + Math.random() * 0.5;
                pp3.active = true;
                this._pullIdx++;
            }

            model.rotation.z = Math.sin(time * 6) * 0.02;

        } else if (progress < 0.78) {
            // Phase 5: Peak height, energy crackle
            var p5 = (progress - 0.65) / 0.13;
            modelHeight = this._loops[2].height;
            model.position.set(
                orig.x + Math.sin(time * 2) * 0.02,
                orig.y + modelHeight + Math.sin(time * 3) * 0.03,
                orig.z
            );

            // All loops pulse brightly
            for (var al = 0; al < 3; al++) {
                this._loops[al].mesh.material.opacity = 0.6 + Math.sin(time * 4 + al) * 0.15;
            }

            // Crackle particles burst
            if (!this._crackleTriggered) {
                this._crackleTriggered = true;
                for (var cc = 0; cc < this._crackles.length; cc++) {
                    this._crackles[cc].mesh.visible = true;
                    this._crackles[cc].mesh.position.set(model.position.x, model.position.y, 0);
                    this._crackles[cc].life = this._crackles[cc].maxLife;
                    this._crackles[cc].active = true;
                }
            }

            // Aura bright at peak
            this._aura.material.opacity = 0.15 + Math.sin(time * 5) * 0.05;
            this._aura.scale.setScalar(1.2 + Math.sin(time * 3) * 0.15);

            // Strands all fade
            for (var sf = 0; sf < 3; sf++) {
                this._strands[sf].line.material.opacity = 0.1 * (1 - p5);
            }

        } else if (progress < 0.90) {
            // Phase 6: Controlled descent via loops
            var p6 = (progress - 0.78) / 0.12;
            modelHeight = this._loops[2].height * (1 - p6 * p6);
            model.position.set(orig.x, orig.y + modelHeight, orig.z);

            // Loops fade from top down
            this._loops[2].mesh.material.opacity = 0.6 * (1 - p6);
            this._loops[1].mesh.material.opacity = 0.6 * Math.max(0, 1 - p6 * 1.5);
            this._loops[0].mesh.material.opacity = 0.6 * Math.max(0, 1 - p6 * 2);

            // Aura fades
            this._aura.material.opacity = 0.1 * (1 - p6);

            model.rotation.z = Math.sin(time * 4) * 0.02 * (1 - p6);

        } else {
            // Phase 7: Land
            var p7 = (progress - 0.90) / 0.10;
            model.position.set(orig.x, orig.y + 0.02 * (1 - p7), orig.z);
            model.scale.copy(this._origScale);
            model.rotation.z = 0;

            // Everything hidden
            for (var hl = 0; hl < 3; hl++) {
                this._loops[hl].mesh.material.opacity = 0;
            }
            this._aura.material.opacity = 0;
        }

        // Update loop rotations
        for (var lr = 0; lr < this._loops.length; lr++) {
            var loop = this._loops[lr];
            if (loop.active) {
                loop.mesh.rotation.x = Math.PI / 3 + Math.sin(time * loop.rotSpeed + lr) * 0.2;
                loop.mesh.rotation.y = time * loop.rotSpeed * 0.5;
            }
        }

        // Update aura position
        this._aura.position.set(model.position.x, model.position.y, -0.1);

        // Update pull particles
        for (var up = 0; up < this._pullParticles.length; up++) {
            var pPart = this._pullParticles[up];
            if (pPart.active && pPart.life > 0) {
                pPart.life -= delta;
                pPart.mesh.position.y += pPart.vy * delta;
                pPart.mesh.position.x += Math.sin(time * 6 + pPart.angle) * 0.005;
                var lifeRatio = Math.max(0, pPart.life / pPart.maxLife);
                pPart.mesh.material.opacity = lifeRatio * 0.4;
                pPart.mesh.scale.setScalar(0.4 + lifeRatio * 0.6);
                if (pPart.life <= 0) {
                    pPart.active = false;
                    pPart.mesh.visible = false;
                }
            }
        }

        // Update crackle particles
        for (var uc = 0; uc < this._crackles.length; uc++) {
            var crack = this._crackles[uc];
            if (crack.active && crack.life > 0) {
                crack.life -= delta;
                crack.mesh.position.x += crack.vx * delta;
                crack.mesh.position.y += crack.vy * delta;
                var cRatio = Math.max(0, crack.life / crack.maxLife);
                crack.mesh.material.opacity = cRatio * 0.6;
                crack.mesh.scale.setScalar(0.3 + (1 - cRatio) * 0.7);
                if (crack.life <= 0) {
                    crack.active = false;
                    crack.mesh.visible = false;
                }
            }
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._loops) {
            this._loops.forEach(function(l) { scene.remove(l.mesh); l.mesh.geometry.dispose(); l.mesh.material.dispose(); });
        }
        if (this._strands) {
            this._strands.forEach(function(s) { scene.remove(s.line); s.line.geometry.dispose(); s.line.material.dispose(); });
        }
        if (this._pullParticles) {
            this._pullParticles.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); });
        }
        if (this._crackles) {
            this._crackles.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); });
        }
        if (this._aura) { scene.remove(this._aura); this._aura.geometry.dispose(); this._aura.material.dispose(); }
        this._loops = this._strands = this._pullParticles = this._crackles = this._aura = null;
    }
};
