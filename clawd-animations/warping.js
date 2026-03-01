export default {
    name: 'Warping',
    label: 'warping',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Grid lines: 6 horizontal + 6 vertical = 12 line geometries
        this._gridLines = [];
        var gridExtent = 1.5;
        var gridSpacing = gridExtent * 2 / 5; // 6 lines = 5 gaps
        var gridSegments = 20; // Points per line for smooth bending

        // Horizontal lines
        for (var h = 0; h < 6; h++) {
            var y = -gridExtent + h * gridSpacing;
            var points = [];
            for (var s = 0; s <= gridSegments; s++) {
                var x = -gridExtent + (s / gridSegments) * gridExtent * 2;
                points.push(new THREE.Vector3(x + this._origPos.x, y + this._origPos.y, -0.2));
            }
            var lineGeo = new THREE.BufferGeometry().setFromPoints(points);
            var lineMat = new THREE.LineBasicMaterial({
                color: 0x2244aa, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending
            });
            var line = new THREE.Line(lineGeo, lineMat);
            scene.add(line);
            this._gridLines.push({
                line: line,
                segments: gridSegments,
                baseY: y,
                baseX: null, // null means horizontal line
                isHorizontal: true
            });
        }

        // Vertical lines
        for (var v = 0; v < 6; v++) {
            var x2 = -gridExtent + v * gridSpacing;
            var points2 = [];
            for (var s2 = 0; s2 <= gridSegments; s2++) {
                var y2 = -gridExtent + (s2 / gridSegments) * gridExtent * 2;
                points2.push(new THREE.Vector3(x2 + this._origPos.x, y2 + this._origPos.y, -0.2));
            }
            var lineGeo2 = new THREE.BufferGeometry().setFromPoints(points2);
            var lineMat2 = new THREE.LineBasicMaterial({
                color: 0x2244aa, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending
            });
            var line2 = new THREE.Line(lineGeo2, lineMat2);
            scene.add(line2);
            this._gridLines.push({
                line: line2,
                segments: gridSegments,
                baseX: x2,
                baseY: null,
                isHorizontal: false
            });
        }

        this._gridExtent = gridExtent;
        this._gridSegments = gridSegments;

        // Warp flash sphere
        var flashGeo = new THREE.SphereGeometry(0.3, 12, 12);
        var flashMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._warpFlash = new THREE.Mesh(flashGeo, flashMat);
        this._warpFlash.position.copy(this._origPos);
        this._warpFlash.visible = false;
        scene.add(this._warpFlash);

        // Warp well glow (gravity well visual)
        var wellGeo = new THREE.SphereGeometry(0.25, 12, 12);
        var wellMat = new THREE.MeshBasicMaterial({
            color: 0x4466ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._wellGlow = new THREE.Mesh(wellGeo, wellMat);
        this._wellGlow.position.set(this._origPos.x, this._origPos.y, -0.15);
        scene.add(this._wellGlow);

        // Ripple rings
        this._ripples = [];
        for (var r = 0; r < 4; r++) {
            var ripGeo = new THREE.TorusGeometry(0.1, 0.008, 6, 32);
            var ripMat = new THREE.MeshBasicMaterial({
                color: 0x6688ff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ripMesh = new THREE.Mesh(ripGeo, ripMat);
            ripMesh.position.set(this._origPos.x, this._origPos.y, -0.1);
            ripMesh.visible = false;
            scene.add(ripMesh);
            this._ripples.push({
                mesh: ripMesh,
                startTime: r * 0.4,
                speed: 1.5,
                active: false
            });
        }

        // Warp destination (slightly offset from origin)
        this._warpDest = { x: this._origPos.x + 0.8, y: this._origPos.y + 0.3 };
        this._wellCenter = { x: this._origPos.x, y: this._origPos.y };
    },
    _distortGrid(wellX, wellY, wellStrength, ripplePhase, time) {
        var orig = this._origPos;
        var extent = this._gridExtent;
        var segs = this._gridSegments;

        for (var i = 0; i < this._gridLines.length; i++) {
            var gl = this._gridLines[i];
            var positions = gl.line.geometry.attributes.position;

            for (var s = 0; s <= segs; s++) {
                var t = s / segs;
                var px, py;

                if (gl.isHorizontal) {
                    px = -extent + t * extent * 2 + orig.x;
                    py = gl.baseY + orig.y;
                } else {
                    px = gl.baseX + orig.x;
                    py = -extent + t * extent * 2 + orig.y;
                }

                // Distance from well center
                var dx = px - wellX;
                var dy = py - wellY;
                var dist = Math.sqrt(dx * dx + dy * dy);

                // Gravity well pull (inverse distance, clamped)
                var pull = wellStrength / (dist + 0.3);
                pull = Math.min(pull, 0.4);

                // Pull toward well center
                var pullX = -dx * pull * 0.3;
                var pullY = -dy * pull * 0.3;

                // Ripple wave (sin based on distance + time)
                var ripple = Math.sin(dist * 8 - ripplePhase) * 0.02 * wellStrength;
                var rippleX = dx > 0 ? ripple * 0.3 : -ripple * 0.3;
                var rippleY = dy > 0 ? ripple * 0.3 : -ripple * 0.3;

                positions.setXYZ(s,
                    px + pullX + rippleX,
                    py + pullY + rippleY,
                    -0.2
                );
            }
            positions.needsUpdate = true;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var oz = orig.z;
        var gridOpacity = 0;
        var wellStrength = 0;
        var ripplePhase = time * 3;
        var wellX = this._wellCenter.x;
        var wellY = this._wellCenter.y;

        if (progress < 0.10) {
            // Phase 1: Grid appears flat
            var p = progress / 0.10;
            gridOpacity = p * 0.4;
            wellStrength = 0;
            model.position.copy(orig);
            model.scale.copy(this._origScale);

        } else if (progress < 0.30) {
            // Phase 2: Gravity well forms, lines bend
            var p2 = (progress - 0.10) / 0.20;
            gridOpacity = 0.4 + p2 * 0.2;
            wellStrength = p2 * 1.5;

            // Well glow
            this._wellGlow.material.opacity = p2 * 0.15;
            this._wellGlow.scale.setScalar(1 + p2 * 0.5);

            model.position.set(orig.x, orig.y - p2 * 0.1, oz);

        } else if (progress < 0.50) {
            // Phase 3: Deep warp, model stretches into well
            var p3 = (progress - 0.30) / 0.20;
            gridOpacity = 0.6;
            wellStrength = 1.5 + p3 * 1.0;

            // Model stretches vertically (spaghettification!)
            var stretchY = 1 + p3 * 0.8;
            var squeezeX = 1 - p3 * 0.3;
            model.scale.set(
                this._origScale.x * squeezeX,
                this._origScale.y * stretchY,
                this._origScale.z
            );
            model.position.set(orig.x, orig.y - 0.1 - p3 * 0.2, oz);

            // Well glow intensifies
            this._wellGlow.material.opacity = 0.15 + p3 * 0.15;
            this._wellGlow.scale.setScalar(1.5 + p3 * 0.5 + Math.sin(time * 5) * 0.1);

            // Model fades near end of phase
            if (p3 > 0.8) {
                model.visible = (p3 - 0.8) / 0.2 < 0.5;
            }

        } else if (progress < 0.55) {
            // Phase 4: Warp flash!
            var p4 = (progress - 0.50) / 0.05;
            gridOpacity = 0.6;
            wellStrength = 2.5 * (1 - p4 * 0.3);

            model.visible = false;

            // Flash
            this._warpFlash.visible = true;
            this._warpFlash.position.set(orig.x, orig.y - 0.3, 0);
            this._warpFlash.material.opacity = (1 - p4) * 0.8;
            this._warpFlash.scale.setScalar(0.5 + p4 * 3);

        } else if (progress < 0.70) {
            // Phase 5: Model reappears at destination, grid ripples
            var p5 = (progress - 0.55) / 0.15;
            gridOpacity = 0.6 - p5 * 0.1;

            // Shift well center toward destination to cause ripple
            wellX = orig.x + (this._warpDest.x - orig.x) * p5;
            wellY = orig.y + (this._warpDest.y - orig.y) * p5;
            wellStrength = 2.5 * (1 - p5);

            // Model reappears at destination and moves back
            if (p5 > 0.2) {
                model.visible = true;
                var reappear = (p5 - 0.2) / 0.8;
                var eased = 1 - (1 - reappear) * (1 - reappear);
                model.position.set(
                    this._warpDest.x + (orig.x - this._warpDest.x) * eased,
                    this._warpDest.y + (orig.y - this._warpDest.y) * eased,
                    oz
                );
                model.scale.set(
                    this._origScale.x * (0.7 + eased * 0.3),
                    this._origScale.y * (1.8 - eased * 0.8),
                    this._origScale.z
                );
            }

            // Flash fades
            this._warpFlash.visible = p5 < 0.3;
            if (p5 < 0.3) {
                this._warpFlash.material.opacity = (1 - p5 / 0.3) * 0.3;
            }

            // Show ripples
            for (var r = 0; r < this._ripples.length; r++) {
                var rip = this._ripples[r];
                rip.mesh.visible = true;
                rip.active = true;
                var ripAge = p5 - rip.startTime * 0.3;
                if (ripAge > 0 && ripAge < 1) {
                    rip.mesh.material.opacity = (1 - ripAge) * 0.3;
                    rip.mesh.scale.setScalar(ripAge * 4);
                    rip.mesh.position.set(wellX, wellY, -0.1);
                } else {
                    rip.mesh.material.opacity = 0;
                }
            }

        } else if (progress < 0.88) {
            // Phase 6: Grid settles flat
            var p6 = (progress - 0.70) / 0.18;
            gridOpacity = 0.5 * (1 - p6);
            wellStrength = 0.5 * (1 - p6);

            model.visible = true;
            model.position.set(
                orig.x,
                orig.y,
                oz
            );
            model.scale.copy(this._origScale);

            // Well glow fades
            this._wellGlow.material.opacity = 0.1 * (1 - p6);

            // Ripples fade
            for (var r2 = 0; r2 < this._ripples.length; r2++) {
                this._ripples[r2].mesh.material.opacity *= (1 - p6);
            }

        } else {
            // Phase 7: Fade
            var p7 = (progress - 0.88) / 0.12;
            gridOpacity = 0;
            wellStrength = 0;

            model.position.copy(orig);
            model.scale.copy(this._origScale);
            model.visible = true;

            this._wellGlow.material.opacity = 0;
            for (var r3 = 0; r3 < this._ripples.length; r3++) {
                this._ripples[r3].mesh.visible = false;
            }
        }

        // Apply grid opacity
        for (var g = 0; g < this._gridLines.length; g++) {
            this._gridLines[g].line.material.opacity = gridOpacity;
        }

        // Distort grid
        if (wellStrength > 0.01) {
            this._distortGrid(wellX, wellY, wellStrength, ripplePhase, time);
        } else if (gridOpacity > 0) {
            // Reset grid to flat
            this._distortGrid(wellX, wellY, 0, 0, time);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._gridLines) {
            this._gridLines.forEach(function(gl) { scene.remove(gl.line); gl.line.geometry.dispose(); gl.line.material.dispose(); });
        }
        if (this._warpFlash) { scene.remove(this._warpFlash); this._warpFlash.geometry.dispose(); this._warpFlash.material.dispose(); }
        if (this._wellGlow) { scene.remove(this._wellGlow); this._wellGlow.geometry.dispose(); this._wellGlow.material.dispose(); }
        if (this._ripples) {
            this._ripples.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); });
        }
        this._gridLines = this._warpFlash = this._wellGlow = this._ripples = null;
    }
};
