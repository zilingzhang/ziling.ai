export default {
    name: 'Boondoggling',
    label: 'boondoggling',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Paper particles (flat boxes that shuffle around)
        this._papers = [];
        var paperGeo = new THREE.BoxGeometry(0.06, 0.08, 0.003);
        var paperColors = [0xddddcc, 0xccccbb, 0xeeeedd, 0xd0d0c0, 0xc8c8b8, 0xe0e0d0, 0xd5d5c5, 0xccccc0];
        for (var i = 0; i < 8; i++) {
            var pMat = new THREE.MeshBasicMaterial({
                color: paperColors[i], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
                side: THREE.DoubleSide
            });
            var pMesh = new THREE.Mesh(paperGeo, pMat);
            pMesh.visible = false;
            scene.add(pMesh);
            this._papers.push({
                mesh: pMesh,
                baseX: ox + (Math.random() - 0.5) * 0.4,
                baseY: oy - 0.1 + (Math.random() - 0.5) * 0.15,
                targetX: 0, targetY: 0,
                shuffling: false, shuffleTimer: 0
            });
        }

        // Progress bar (two boxes: background and fill)
        var barBgGeo = new THREE.BoxGeometry(0.4, 0.025, 0.002);
        var barBgMat = new THREE.MeshBasicMaterial({
            color: 0x666655, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._barBg = new THREE.Mesh(barBgGeo, barBgMat);
        this._barBg.position.set(ox, oy + 0.25, 0);
        this._barBg.visible = false;
        scene.add(this._barBg);

        var barFillGeo = new THREE.BoxGeometry(0.01, 0.02, 0.003);
        var barFillMat = new THREE.MeshBasicMaterial({
            color: 0xaaaa44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._barFill = new THREE.Mesh(barFillGeo, barFillMat);
        this._barFill.position.set(ox - 0.195, oy + 0.25, 0.001);
        this._barFill.visible = false;
        scene.add(this._barFill);

        // Clock torus (spinning hands)
        var clockGeo = new THREE.TorusGeometry(0.06, 0.006, 6, 20);
        var clockMat = new THREE.MeshBasicMaterial({
            color: 0x998877, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._clock = new THREE.Mesh(clockGeo, clockMat);
        this._clock.position.set(ox - 0.4, oy + 0.2, 0);
        this._clock.visible = false;
        scene.add(this._clock);

        // Clock hands (thin boxes)
        var handGeo = new THREE.BoxGeometry(0.003, 0.05, 0.002);
        var handMat = new THREE.MeshBasicMaterial({
            color: 0x554433, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._clockHand1 = new THREE.Mesh(handGeo, handMat);
        this._clockHand1.visible = false;
        scene.add(this._clockHand1);

        var handGeo2 = new THREE.BoxGeometry(0.003, 0.035, 0.002);
        var handMat2 = new THREE.MeshBasicMaterial({
            color: 0x554433, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._clockHand2 = new THREE.Mesh(handGeo2, handMat2);
        this._clockHand2.visible = false;
        scene.add(this._clockHand2);

        // Busywork pile (stacking boxes on right)
        this._pile = [];
        var pileGeo = new THREE.BoxGeometry(0.05, 0.03, 0.04);
        for (var j = 0; j < 6; j++) {
            var pileMat = new THREE.MeshBasicMaterial({
                color: 0xbbbb99 + j * 0x050505, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var pileMesh = new THREE.Mesh(pileGeo, pileMat);
            pileMesh.visible = false;
            scene.add(pileMesh);
            this._pile.push({
                mesh: pileMesh,
                targetY: oy - 0.2 + j * 0.035,
                shown: false
            });
        }

        // Bureaucratic glow
        var bgGeo = new THREE.SphereGeometry(0.35, 10, 10);
        var bgMat = new THREE.MeshBasicMaterial({
            color: 0xbbbb88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._bureauGlow = new THREE.Mesh(bgGeo, bgMat);
        this._bureauGlow.position.set(ox, oy, 0);
        scene.add(this._bureauGlow);

        this._progressVal = 0;
        this._progressDir = 1;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.08) {
            // Phase 1: Model sits down, papers appear
            var t = progress / 0.08;
            model.position.set(ox, oy - t * 0.02, oz);
            model.rotation.z = 0;

            for (var i = 0; i < this._papers.length; i++) {
                var p = this._papers[i];
                p.mesh.visible = true;
                p.mesh.material.opacity = t * 0.5;
                p.mesh.position.set(p.baseX, p.baseY, 0.01 * i);
                p.mesh.rotation.z = (Math.random() - 0.5) * 0.3;
            }

            this._barBg.visible = true;
            this._barBg.material.opacity = t * 0.4;
            this._barFill.visible = true;
            this._barFill.material.opacity = t * 0.6;
        } else if (progress < 0.30) {
            // Phase 2: Shuffling papers, progress bar moves forward
            var t2 = (progress - 0.08) / 0.22;
            model.position.set(ox + Math.sin(time * 3) * 0.02, oy - 0.02, oz);
            model.rotation.z = Math.sin(time * 4) * 0.03;

            // Papers shuffle
            for (var i2 = 0; i2 < this._papers.length; i2++) {
                var p2 = this._papers[i2];
                p2.mesh.material.opacity = 0.5;
                var shuffleX = Math.sin(time * 2 + i2 * 1.5) * 0.08;
                var shuffleY = Math.cos(time * 1.7 + i2 * 0.9) * 0.04;
                p2.mesh.position.set(p2.baseX + shuffleX, p2.baseY + shuffleY, 0.01 * i2);
                p2.mesh.rotation.z = Math.sin(time * 2 + i2) * 0.2;
            }

            // Progress goes forward
            this._progressVal = t2 * 0.5;
            this._barFill.scale.x = Math.max(1, this._progressVal * 40);
            this._barFill.position.x = ox - 0.195 + this._progressVal * 0.2;
            this._barFill.material.opacity = 0.6;

            // Clock appears and spins
            this._clock.visible = true;
            this._clock.material.opacity = t2 * 0.5;
            this._clockHand1.visible = true;
            this._clockHand1.material.opacity = t2 * 0.6;
            this._clockHand2.visible = true;
            this._clockHand2.material.opacity = t2 * 0.6;

            var chx = ox - 0.4;
            var chy = oy + 0.2;
            this._clockHand1.position.set(
                chx + Math.sin(time * 4) * 0.02,
                chy + Math.cos(time * 4) * 0.02,
                0.01
            );
            this._clockHand1.rotation.z = time * 4;
            this._clockHand2.position.set(
                chx + Math.sin(time * 1.5) * 0.015,
                chy + Math.cos(time * 1.5) * 0.015,
                0.01
            );
            this._clockHand2.rotation.z = time * 1.5;

            this._bureauGlow.material.opacity = t2 * 0.08;
        } else if (progress < 0.50) {
            // Phase 3: Progress goes backward! Papers rearrange but nothing finishes
            var t3 = (progress - 0.30) / 0.20;

            model.position.set(ox + Math.sin(time * 2.5) * 0.03, oy - 0.02, oz);
            model.rotation.z = Math.sin(time * 3) * 0.04;

            // Progress bar oscillates
            this._progressVal = 0.5 - t3 * 0.3 + Math.sin(time * 2) * 0.1;
            if (this._progressVal < 0.05) this._progressVal = 0.05;
            this._barFill.scale.x = Math.max(1, this._progressVal * 40);
            this._barFill.position.x = ox - 0.195 + this._progressVal * 0.2;

            // Papers shuffle more frantically
            for (var i3 = 0; i3 < this._papers.length; i3++) {
                var p3 = this._papers[i3];
                var shuffleX2 = Math.sin(time * 3 + i3 * 1.2) * 0.12;
                var shuffleY2 = Math.cos(time * 2.5 + i3 * 0.8) * 0.06;
                p3.mesh.position.set(p3.baseX + shuffleX2, p3.baseY + shuffleY2, 0.01 * i3);
                p3.mesh.rotation.z = Math.sin(time * 3 + i3) * 0.4;
            }

            // Clock spins fast
            this._clockHand1.rotation.z = time * 8;
            this._clockHand2.rotation.z = time * 3;
            var chx2 = ox - 0.4;
            var chy2 = oy + 0.2;
            this._clockHand1.position.set(
                chx2 + Math.sin(time * 8) * 0.02,
                chy2 + Math.cos(time * 8) * 0.02, 0.01
            );
            this._clockHand2.position.set(
                chx2 + Math.sin(time * 3) * 0.015,
                chy2 + Math.cos(time * 3) * 0.015, 0.01
            );
            this._clock.material.opacity = 0.5;
            this._clockHand1.material.opacity = 0.6;
            this._clockHand2.material.opacity = 0.6;

            // Pile starts building
            var pileCount = Math.floor(t3 * 3);
            for (var j = 0; j < this._pile.length; j++) {
                if (j < pileCount) {
                    var pm = this._pile[j];
                    pm.mesh.visible = true;
                    pm.mesh.material.opacity = 0.5;
                    pm.mesh.position.set(ox + 0.45, pm.targetY, 0);
                    pm.mesh.rotation.z = (Math.random() - 0.5) * 0.1;
                }
            }

            this._bureauGlow.material.opacity = 0.1;
        } else if (progress < 0.70) {
            // Phase 4: More busywork, progress bar goes forward then back again
            var t4 = (progress - 0.50) / 0.20;

            model.position.set(ox + Math.sin(time * 2) * 0.04, oy - 0.02, oz);
            model.rotation.z = Math.sin(time * 2) * 0.05;

            // Progress bar: forward then back
            var progressCycle = Math.sin(t4 * Math.PI * 2) * 0.3 + 0.3;
            this._progressVal = progressCycle;
            this._barFill.scale.x = Math.max(1, this._progressVal * 40);
            this._barFill.position.x = ox - 0.195 + this._progressVal * 0.2;

            // Papers still shuffling
            for (var i4 = 0; i4 < this._papers.length; i4++) {
                var p4 = this._papers[i4];
                var sx = Math.sin(time * 2.5 + i4 * 1.3) * 0.1;
                var sy = Math.cos(time * 2 + i4 * 0.7) * 0.05;
                p4.mesh.position.set(p4.baseX + sx, p4.baseY + sy, 0.01 * i4);
                p4.mesh.rotation.z = Math.sin(time * 2 + i4) * 0.3;
            }

            // More pile
            var pileCount2 = 3 + Math.floor(t4 * 3);
            for (var j2 = 0; j2 < this._pile.length; j2++) {
                if (j2 < pileCount2) {
                    this._pile[j2].mesh.visible = true;
                    this._pile[j2].mesh.material.opacity = 0.5;
                    this._pile[j2].mesh.position.set(ox + 0.45, this._pile[j2].targetY, 0);
                    this._pile[j2].mesh.rotation.z = Math.sin(time + j2) * 0.05;
                }
            }

            // Clock frantic
            this._clockHand1.rotation.z = time * 10;
            this._clockHand2.rotation.z = time * 4;
            var chx3 = ox - 0.4;
            var chy3 = oy + 0.2;
            this._clockHand1.position.set(chx3 + Math.sin(time * 10) * 0.02, chy3 + Math.cos(time * 10) * 0.02, 0.01);
            this._clockHand2.position.set(chx3 + Math.sin(time * 4) * 0.015, chy3 + Math.cos(time * 4) * 0.015, 0.01);

            this._bureauGlow.material.opacity = 0.12;
        } else if (progress < 0.85) {
            // Phase 5: Giving up - progress bar resets, papers scatter
            var t5 = (progress - 0.70) / 0.15;

            model.position.set(ox, oy - 0.02 + t5 * 0.02, oz);
            model.rotation.z = -t5 * 0.04;

            // Progress bar shrinks to nothing
            this._progressVal = 0.3 * (1 - t5);
            this._barFill.scale.x = Math.max(1, this._progressVal * 40);
            this._barFill.position.x = ox - 0.195 + this._progressVal * 0.2;
            this._barBg.material.opacity = 0.4 * (1 - t5);
            this._barFill.material.opacity = 0.6 * (1 - t5);

            // Papers scatter
            for (var i5 = 0; i5 < this._papers.length; i5++) {
                var p5 = this._papers[i5];
                p5.mesh.position.x += (Math.sin(i5 * 2.1) * 0.5) * delta;
                p5.mesh.position.y += (Math.cos(i5 * 1.7) * 0.3) * delta;
                p5.mesh.material.opacity = 0.5 * (1 - t5);
                p5.mesh.rotation.z += delta * 2;
            }

            // Clock fades
            this._clock.material.opacity = 0.5 * (1 - t5);
            this._clockHand1.material.opacity = 0.6 * (1 - t5);
            this._clockHand2.material.opacity = 0.6 * (1 - t5);

            // Pile fades
            for (var j3 = 0; j3 < this._pile.length; j3++) {
                this._pile[j3].mesh.material.opacity = 0.5 * (1 - t5);
            }

            this._bureauGlow.material.opacity = 0.12 * (1 - t5);
        } else {
            // Phase 6: Fade out, return to normal
            var t6 = (progress - 0.85) / 0.15;
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            for (var i6 = 0; i6 < this._papers.length; i6++) {
                this._papers[i6].mesh.material.opacity = 0;
                this._papers[i6].mesh.visible = false;
            }
            this._barBg.visible = false;
            this._barFill.visible = false;
            this._clock.visible = false;
            this._clockHand1.visible = false;
            this._clockHand2.visible = false;
            for (var j4 = 0; j4 < this._pile.length; j4++) {
                this._pile[j4].mesh.visible = false;
            }
            this._bureauGlow.material.opacity = 0;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._papers) { this._papers.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        if (this._barBg) { scene.remove(this._barBg); this._barBg.geometry.dispose(); this._barBg.material.dispose(); }
        if (this._barFill) { scene.remove(this._barFill); this._barFill.geometry.dispose(); this._barFill.material.dispose(); }
        if (this._clock) { scene.remove(this._clock); this._clock.geometry.dispose(); this._clock.material.dispose(); }
        if (this._clockHand1) { scene.remove(this._clockHand1); this._clockHand1.geometry.dispose(); this._clockHand1.material.dispose(); }
        if (this._clockHand2) { scene.remove(this._clockHand2); this._clockHand2.geometry.dispose(); this._clockHand2.material.dispose(); }
        if (this._pile) { this._pile.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        if (this._bureauGlow) { scene.remove(this._bureauGlow); this._bureauGlow.geometry.dispose(); this._bureauGlow.material.dispose(); }
        this._papers = this._barBg = this._barFill = this._clock = this._clockHand1 = this._clockHand2 = this._pile = this._bureauGlow = null;
    }
};
