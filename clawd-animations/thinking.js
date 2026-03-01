export default {
    name: 'Thinking',
    label: 'thinking',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Three ellipsis dots (iconic dot dot dot over head)
        this._dots = [];
        var dotGeo = new THREE.SphereGeometry(0.025, 8, 8);
        var dotPositions = [
            { x: ox - 0.06, y: oy + 0.22 },
            { x: ox, y: oy + 0.22 },
            { x: ox + 0.06, y: oy + 0.22 }
        ];
        for (var i = 0; i < 3; i++) {
            var dMat = new THREE.MeshBasicMaterial({
                color: 0xeeeeff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var dot = new THREE.Mesh(dotGeo, dMat);
            dot.position.set(dotPositions[i].x, dotPositions[i].y, 0.02);
            dot.visible = false;
            scene.add(dot);
            this._dots.push({
                mesh: dot,
                baseX: dotPositions[i].x,
                baseY: dotPositions[i].y,
                phase: i * (Math.PI * 2 / 3)
            });
        }

        // Thought bubble chain (3 ascending circles from head to dots)
        this._bubbles = [];
        var bubSizes = [0.012, 0.018, 0.025];
        var bubPositions = [
            { x: ox + 0.06, y: oy + 0.13 },
            { x: ox + 0.05, y: oy + 0.16 },
            { x: ox + 0.03, y: oy + 0.19 }
        ];
        for (var b = 0; b < 3; b++) {
            var bGeo = new THREE.SphereGeometry(bubSizes[b], 7, 7);
            var bMat = new THREE.MeshBasicMaterial({
                color: 0xddddff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bub = new THREE.Mesh(bGeo, bMat);
            bub.position.set(bubPositions[b].x, bubPositions[b].y, 0.01);
            bub.visible = false;
            scene.add(bub);
            this._bubbles.push({
                mesh: bub,
                baseX: bubPositions[b].x,
                baseY: bubPositions[b].y
            });
        }

        // Neural activity particles (inside skull-area glow)
        this._neuralParticles = [];
        var nGeo = new THREE.SphereGeometry(0.008, 5, 5);
        for (var n = 0; n < 20; n++) {
            var nMat = new THREE.MeshBasicMaterial({
                color: n % 4 === 0 ? 0xaabbff : (n % 4 === 1 ? 0xbbaaff : (n % 4 === 2 ? 0xccbbff : 0xaaccff)),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var np = new THREE.Mesh(nGeo, nMat);
            np.visible = false;
            scene.add(np);
            this._neuralParticles.push({
                mesh: np,
                angle: Math.random() * Math.PI * 2,
                dist: 0.03 + Math.random() * 0.06,
                speed: 1.5 + Math.random() * 2,
                offsetY: (Math.random() - 0.5) * 0.04
            });
        }

        // Skull-area glow
        var glowGeo = new THREE.SphereGeometry(0.15, 10, 10);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0x8899cc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._skullGlow = new THREE.Mesh(glowGeo, glowMat);
        this._skullGlow.position.set(ox, oy + 0.1, -0.02);
        scene.add(this._skullGlow);

        // Dot highlight glow (pulses with each dot)
        var dhGeo = new THREE.SphereGeometry(0.04, 8, 8);
        var dhMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._dotHighlight = new THREE.Mesh(dhGeo, dhMat);
        this._dotHighlight.visible = false;
        scene.add(this._dotHighlight);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;

        // Dot animation cycle: dots pulse in sequence (1-2-3, 1-2-3...)
        var dotCycle = (time * 2) % 3;
        var activeDot = Math.floor(dotCycle);

        if (progress < 0.08) {
            // Phase 1: Bubbles appear, then dots
            var t = progress / 0.08;

            for (var bi = 0; bi < 3; bi++) {
                if (t > bi * 0.2) {
                    var bf = Math.min(1, (t - bi * 0.2) * 3);
                    this._bubbles[bi].mesh.visible = true;
                    this._bubbles[bi].mesh.material.opacity = bf * 0.4;
                    this._bubbles[bi].mesh.scale.setScalar(bf);
                }
            }

            if (t > 0.5) {
                var df = (t - 0.5) * 2;
                for (var di = 0; di < 3; di++) {
                    this._dots[di].mesh.visible = true;
                    this._dots[di].mesh.material.opacity = df * 0.5;
                }
            }

            this._skullGlow.material.opacity = t * 0.03;
            model.position.set(ox, oy, orig.z);
        } else if (progress < 0.35) {
            // Phase 2: Classic dot-dot-dot animation begins
            var t2 = (progress - 0.08) / 0.27;

            // All bubbles visible
            for (var bj = 0; bj < 3; bj++) {
                this._bubbles[bj].mesh.material.opacity = 0.4 + Math.sin(time * 1.5 + bj) * 0.08;
                this._bubbles[bj].mesh.position.y = this._bubbles[bj].baseY + Math.sin(time * 1.5 + bj * 0.5) * 0.003;
            }

            // Dots pulse in sequence
            for (var dj = 0; dj < 3; dj++) {
                var isActive = Math.floor(dotCycle) === dj;
                var dotPhase = (dotCycle - dj + 3) % 3;
                var pulse = dotPhase < 1 ? Math.sin(dotPhase * Math.PI) : 0;
                this._dots[dj].mesh.material.opacity = 0.4 + pulse * 0.5;
                this._dots[dj].mesh.scale.setScalar(0.8 + pulse * 0.4);
                this._dots[dj].mesh.position.y = this._dots[dj].baseY + pulse * 0.015;
            }

            // Dot highlight follows active dot
            this._dotHighlight.visible = true;
            this._dotHighlight.position.set(this._dots[activeDot].mesh.position.x, this._dots[activeDot].mesh.position.y, 0.03);
            this._dotHighlight.material.opacity = 0.2;

            // Neural particles start
            for (var ni = 0; ni < 20; ni++) {
                if (t2 > ni * 0.04) {
                    this._neuralParticles[ni].mesh.visible = true;
                }
            }

            this._skullGlow.material.opacity = 0.03 + t2 * 0.04;
            model.position.set(ox, oy + Math.sin(time * 1) * 0.003, orig.z);
        } else if (progress < 0.75) {
            // Phase 3: Full thinking mode
            var t3 = (progress - 0.35) / 0.40;

            // Dots continue pulsing
            for (var dk = 0; dk < 3; dk++) {
                var dotPhase2 = (dotCycle - dk + 3) % 3;
                var pulse2 = dotPhase2 < 1 ? Math.sin(dotPhase2 * Math.PI) : 0;
                this._dots[dk].mesh.material.opacity = 0.4 + pulse2 * 0.5;
                this._dots[dk].mesh.scale.setScalar(0.8 + pulse2 * 0.4);
                this._dots[dk].mesh.position.y = this._dots[dk].baseY + pulse2 * 0.015;
            }

            this._dotHighlight.position.set(this._dots[activeDot].mesh.position.x, this._dots[activeDot].mesh.position.y, 0.03);
            var hlPulse = (dotCycle - activeDot);
            this._dotHighlight.material.opacity = hlPulse < 1 ? Math.sin(hlPulse * Math.PI) * 0.25 : 0;

            // Bubbles float
            for (var bk = 0; bk < 3; bk++) {
                this._bubbles[bk].mesh.material.opacity = 0.4 + Math.sin(time * 1.5 + bk) * 0.1;
                this._bubbles[bk].mesh.position.y = this._bubbles[bk].baseY + Math.sin(time * 1.2 + bk * 0.8) * 0.004;
            }

            // Neural particles active
            this._skullGlow.material.opacity = 0.07 + Math.sin(time * 2) * 0.02;
            this._skullGlow.scale.setScalar(1 + Math.sin(time * 1.5) * 0.05);

            model.position.set(ox, oy + Math.sin(time * 1) * 0.004, orig.z);
            model.rotation.z = Math.sin(time * 0.5) * 0.01;
        } else if (progress < 0.90) {
            // Phase 4: Dots slow, thinking concludes
            var t4 = (progress - 0.75) / 0.15;

            for (var dl = 0; dl < 3; dl++) {
                this._dots[dl].mesh.material.opacity = (0.6 - t4 * 0.2) + Math.sin(time * (2 - t4 * 1.5) + dl) * 0.1;
                this._dots[dl].mesh.scale.setScalar(1);
                this._dots[dl].mesh.position.y = this._dots[dl].baseY;
            }

            this._dotHighlight.material.opacity = 0.15 * (1 - t4);

            for (var bl = 0; bl < 3; bl++) {
                this._bubbles[bl].mesh.material.opacity = 0.4 * (1 - t4 * 0.5);
            }

            this._skullGlow.material.opacity = 0.07 * (1 - t4 * 0.5);

            model.position.set(ox, oy + Math.sin(time * 1) * 0.003 * (1 - t4), orig.z);
            model.rotation.z = Math.sin(time * 0.5) * 0.01 * (1 - t4);
        } else {
            // Phase 5: Final fade
            var t5 = (progress - 0.90) / 0.10;
            for (var dm = 0; dm < 3; dm++) {
                this._dots[dm].mesh.material.opacity = 0.4 * (1 - t5);
            }
            for (var bm = 0; bm < 3; bm++) {
                this._bubbles[bm].mesh.material.opacity = 0.2 * (1 - t5);
            }
            this._skullGlow.material.opacity = 0.035 * (1 - t5);
            this._dotHighlight.material.opacity = 0;

            for (var nn = 0; nn < 20; nn++) {
                this._neuralParticles[nn].mesh.material.opacity *= (1 - t5 * 0.08);
            }

            model.position.set(ox, oy, orig.z);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update neural particles (orbit around skull area)
        for (var nu = 0; nu < this._neuralParticles.length; nu++) {
            var np = this._neuralParticles[nu];
            if (!np.mesh.visible) continue;
            np.angle += np.speed * delta;
            np.mesh.position.set(
                ox + Math.cos(np.angle) * np.dist,
                oy + 0.1 + Math.sin(np.angle) * np.dist * 0.7 + np.offsetY,
                0.01
            );
            np.mesh.material.opacity = 0.3 + Math.sin(time * 4 + nu) * 0.15;
            np.mesh.scale.setScalar(0.5 + Math.sin(time * 3 + nu * 0.7) * 0.3);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._dots) {
            this._dots.forEach(function(d) {
                scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose();
            });
        }
        if (this._bubbles) {
            this._bubbles.forEach(function(b) {
                scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose();
            });
        }
        if (this._neuralParticles) {
            this._neuralParticles.forEach(function(n) {
                scene.remove(n.mesh); n.mesh.geometry.dispose(); n.mesh.material.dispose();
            });
        }
        if (this._skullGlow) { scene.remove(this._skullGlow); this._skullGlow.geometry.dispose(); this._skullGlow.material.dispose(); }
        if (this._dotHighlight) { scene.remove(this._dotHighlight); this._dotHighlight.geometry.dispose(); this._dotHighlight.material.dispose(); }
        this._dots = this._bubbles = this._neuralParticles = this._skullGlow = this._dotHighlight = null;
    }
};
