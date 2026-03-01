export default {
    name: 'Reticulating',
    label: 'reticulating',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // 15 node spheres at scattered positions
        this._nodes = [];
        var nodeGeo = new THREE.SphereGeometry(0.025, 8, 8);
        var nodeColors = [0x44ddff, 0x44ffaa, 0x66ccff, 0x55eebb, 0x88ddff,
                          0x33ccaa, 0x77eeff, 0x44ffcc, 0x55bbff, 0x66ffbb,
                          0x44aaff, 0x55ddcc, 0x88ccee, 0x44eedd, 0x77ffaa];
        // Scatter positions in a roughly circular area around the model
        var nodePositions = [];
        for (var i = 0; i < 15; i++) {
            var angle = (i / 15) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            var dist = 0.15 + Math.random() * 0.35;
            nodePositions.push({
                x: ox + Math.cos(angle) * dist,
                y: oy + Math.sin(angle) * dist * 0.7
            });
        }

        for (var j = 0; j < 15; j++) {
            var nMat = new THREE.MeshBasicMaterial({
                color: nodeColors[j],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var node = new THREE.Mesh(nodeGeo, nMat);
            node.position.set(nodePositions[j].x, nodePositions[j].y, 0.02);
            node.visible = false;
            scene.add(node);
            this._nodes.push({
                mesh: node,
                x: nodePositions[j].x,
                y: nodePositions[j].y,
                appearTime: 0.02 + (j / 15) * 0.30,
                appeared: false,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }

        // 20 connection line geometries (draw between nearby nodes)
        this._connections = [];
        // Pre-compute which nodes connect (nearest neighbors within distance threshold)
        var maxDist = 0.35;
        var connPairs = [];
        for (var a = 0; a < 15; a++) {
            for (var b = a + 1; b < 15; b++) {
                var dx = nodePositions[a].x - nodePositions[b].x;
                var dy = nodePositions[a].y - nodePositions[b].y;
                var d = Math.sqrt(dx * dx + dy * dy);
                if (d < maxDist) {
                    connPairs.push({ from: a, to: b, dist: d });
                }
            }
        }
        // Sort by distance, take up to 20
        connPairs.sort(function(a2, b2) { return a2.dist - b2.dist; });
        var connCount = Math.min(20, connPairs.length);

        for (var k = 0; k < connCount; k++) {
            var cMat = new THREE.LineBasicMaterial({
                color: k % 3 === 0 ? 0x44ddff : (k % 3 === 1 ? 0x44ffaa : 0x66ccff),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending
            });
            var cPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
            var cGeo = new THREE.BufferGeometry().setFromPoints(cPoints);
            var cLine = new THREE.Line(cGeo, cMat);
            cLine.visible = false;
            scene.add(cLine);
            this._connections.push({
                line: cLine,
                fromIdx: connPairs[k].from,
                toIdx: connPairs[k].to,
                drawStart: 0.10 + (k / connCount) * 0.25,
                drawEnd: 0.10 + (k / connCount) * 0.25 + 0.08,
                drawProgress: 0,
                pulseOffset: Math.random() * Math.PI * 2
            });
        }

        // 10 data flow particles (travel along connections)
        this._dataParticles = [];
        var dpGeo = new THREE.SphereGeometry(0.012, 5, 5);
        for (var m = 0; m < 10; m++) {
            var dpMat = new THREE.MeshBasicMaterial({
                color: m % 2 === 0 ? 0x88ffdd : 0x44ccff,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var dp = new THREE.Mesh(dpGeo, dpMat);
            dp.visible = false;
            scene.add(dp);
            this._dataParticles.push({
                mesh: dp,
                connIdx: -1,
                pathT: 0,
                speed: 0,
                active: false,
                reverse: false
            });
        }
        this._dpIdx = 0;
        this._lastDataSpawn = 0;

        // Network hum glow
        var humGeo = new THREE.SphereGeometry(0.5, 14, 14);
        var humMat = new THREE.MeshBasicMaterial({
            color: 0x44aacc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._humGlow = new THREE.Mesh(humGeo, humMat);
        this._humGlow.position.set(ox, oy, -0.1);
        scene.add(this._humGlow);
    },
    _spawnDataParticle(time) {
        // Pick a random completed connection
        var validConns = [];
        for (var i = 0; i < this._connections.length; i++) {
            if (this._connections[i].drawProgress >= 1) {
                validConns.push(i);
            }
        }
        if (validConns.length === 0) return;

        var dp = this._dataParticles[this._dpIdx % this._dataParticles.length];
        this._dpIdx++;
        var connIdx = validConns[Math.floor(Math.random() * validConns.length)];
        dp.connIdx = connIdx;
        dp.pathT = 0;
        dp.speed = 1.5 + Math.random() * 2.0;
        dp.active = true;
        dp.reverse = Math.random() > 0.5;
        dp.mesh.visible = true;
        dp.mesh.material.opacity = 0.8;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.10) {
            // Phase 1: First nodes appear
            var t = progress / 0.10;

            for (var ni = 0; ni < this._nodes.length; ni++) {
                var nd = this._nodes[ni];
                if (progress >= nd.appearTime && !nd.appeared) {
                    nd.appeared = true;
                    nd.mesh.visible = true;
                }
                if (nd.mesh.visible) {
                    var nodeFade = Math.min(1, (progress - nd.appearTime) / 0.03);
                    nd.mesh.material.opacity = nodeFade * 0.6;
                    nd.mesh.scale.setScalar(nodeFade * 0.8);
                }
            }

            model.position.set(ox, oy + Math.sin(time * 1.5) * 0.003, oz);
        } else if (progress < 0.35) {
            // Phase 2: Connections start drawing between nearest nodes
            var t2 = (progress - 0.10) / 0.25;

            // Continue appearing nodes
            for (var nj = 0; nj < this._nodes.length; nj++) {
                var nd2 = this._nodes[nj];
                if (!nd2.appeared && progress >= nd2.appearTime) {
                    nd2.appeared = true;
                    nd2.mesh.visible = true;
                }
                if (nd2.mesh.visible) {
                    nd2.mesh.material.opacity = 0.6 + Math.sin(time * 2 + nd2.pulsePhase) * 0.1;
                    nd2.mesh.scale.setScalar(0.8 + Math.sin(time * 1.5 + nj) * 0.1);
                }
            }

            // Draw connections progressively
            for (var ci = 0; ci < this._connections.length; ci++) {
                var conn = this._connections[ci];
                if (progress >= conn.drawStart && progress < conn.drawEnd) {
                    conn.line.visible = true;
                    conn.drawProgress = (progress - conn.drawStart) / (conn.drawEnd - conn.drawStart);

                    var fromN = this._nodes[conn.fromIdx];
                    var toN = this._nodes[conn.toIdx];
                    var positions = conn.line.geometry.attributes.position;
                    positions.setXYZ(0, fromN.x, fromN.y, 0.01);
                    var endX = fromN.x + (toN.x - fromN.x) * conn.drawProgress;
                    var endY = fromN.y + (toN.y - fromN.y) * conn.drawProgress;
                    positions.setXYZ(1, endX, endY, 0.01);
                    positions.needsUpdate = true;

                    conn.line.material.opacity = conn.drawProgress * 0.4;
                } else if (progress >= conn.drawEnd) {
                    conn.drawProgress = 1;
                    conn.line.visible = true;
                    var fromN2 = this._nodes[conn.fromIdx];
                    var toN2 = this._nodes[conn.toIdx];
                    var positions2 = conn.line.geometry.attributes.position;
                    positions2.setXYZ(0, fromN2.x, fromN2.y, 0.01);
                    positions2.setXYZ(1, toN2.x, toN2.y, 0.01);
                    positions2.needsUpdate = true;
                    conn.line.material.opacity = 0.4;
                }
            }

            model.position.set(ox, oy + Math.sin(time * 1.2) * 0.005, oz);
        } else if (progress < 0.55) {
            // Phase 3: Network expands, more nodes + connections fully drawn
            var t3 = (progress - 0.35) / 0.20;

            // All nodes visible and pulsing
            for (var nk = 0; nk < this._nodes.length; nk++) {
                var nd3 = this._nodes[nk];
                nd3.mesh.visible = true;
                nd3.mesh.material.opacity = 0.6 + Math.sin(time * 2 + nd3.pulsePhase) * 0.15;
                nd3.mesh.scale.setScalar(0.8 + Math.sin(time * 1.8 + nk * 0.4) * 0.12);
            }

            // All connections drawn
            for (var cj = 0; cj < this._connections.length; cj++) {
                var conn2 = this._connections[cj];
                if (!conn2.line.visible) {
                    conn2.line.visible = true;
                    conn2.drawProgress = 1;
                }
                var fromN3 = this._nodes[conn2.fromIdx];
                var toN3 = this._nodes[conn2.toIdx];
                var positions3 = conn2.line.geometry.attributes.position;
                positions3.setXYZ(0, fromN3.x, fromN3.y, 0.01);
                positions3.setXYZ(1, toN3.x, toN3.y, 0.01);
                positions3.needsUpdate = true;
                conn2.line.material.opacity = 0.4 + Math.sin(time * 2 + conn2.pulseOffset) * 0.1;
            }

            // Hum glow starts
            this._humGlow.material.opacity = t3 * 0.06;

            model.position.set(ox, oy + Math.sin(time * 1) * 0.005, oz);
            model.rotation.z = Math.sin(time * 0.5) * 0.01;
        } else if (progress < 0.72) {
            // Phase 4: Pulse waves travel through network
            var t4 = (progress - 0.55) / 0.17;

            // Nodes pulse with traveling wave
            for (var nl = 0; nl < this._nodes.length; nl++) {
                var nd4 = this._nodes[nl];
                // Wave travels across x position
                var waveX = ox - 0.5 + t4 * 1.0 + Math.sin(time * 3) * 0.2;
                var distToWave = Math.abs(nd4.x - waveX);
                var waveIntensity = Math.max(0, 1 - distToWave * 4);
                nd4.mesh.material.opacity = 0.6 + waveIntensity * 0.4;
                nd4.mesh.scale.setScalar(0.8 + waveIntensity * 0.5);
            }

            // Connections pulse with wave
            for (var ck = 0; ck < this._connections.length; ck++) {
                var conn3 = this._connections[ck];
                var fromN4 = this._nodes[conn3.fromIdx];
                var toN4 = this._nodes[conn3.toIdx];
                var midX = (fromN4.x + toN4.x) * 0.5;
                var waveX2 = ox - 0.5 + t4 * 1.0 + Math.sin(time * 3) * 0.2;
                var distToWave2 = Math.abs(midX - waveX2);
                var waveInt2 = Math.max(0, 1 - distToWave2 * 3);
                conn3.line.material.opacity = 0.4 + waveInt2 * 0.4;
            }

            // Hum grows
            this._humGlow.material.opacity = 0.06 + t4 * 0.06;
            this._humGlow.scale.setScalar(1 + Math.sin(time * 2) * 0.08);

            model.position.set(ox, oy, oz);
            model.rotation.z = Math.sin(time * 0.5) * 0.015;
        } else if (progress < 0.85) {
            // Phase 5: Full network hums, data particles flow along connections
            var t5 = (progress - 0.72) / 0.13;

            // All nodes at steady pulse
            for (var nm = 0; nm < this._nodes.length; nm++) {
                var nd5 = this._nodes[nm];
                nd5.mesh.material.opacity = 0.7 + Math.sin(time * 3 + nd5.pulsePhase) * 0.15;
                nd5.mesh.scale.setScalar(0.9 + Math.sin(time * 2 + nm * 0.3) * 0.1);
            }

            // Connections at steady glow
            for (var cl = 0; cl < this._connections.length; cl++) {
                this._connections[cl].line.material.opacity = 0.5 + Math.sin(time * 2.5 + cl * 0.4) * 0.1;
            }

            // Spawn data flow particles
            if (time - this._lastDataSpawn > 0.15) {
                this._spawnDataParticle(time);
                this._lastDataSpawn = time;
            }

            // Hum at peak
            this._humGlow.material.opacity = 0.12 + Math.sin(time * 3) * 0.03;
            this._humGlow.scale.setScalar(1 + Math.sin(time * 2) * 0.1);

            model.position.set(ox, oy, oz);
        } else {
            // Phase 6: Fade
            var t6 = (progress - 0.85) / 0.15;

            // Everything fades
            for (var nn = 0; nn < this._nodes.length; nn++) {
                this._nodes[nn].mesh.material.opacity = 0.7 * (1 - t6);
                if (this._nodes[nn].mesh.material.opacity < 0.01) this._nodes[nn].mesh.visible = false;
            }
            for (var cm = 0; cm < this._connections.length; cm++) {
                this._connections[cm].line.material.opacity = 0.5 * (1 - t6);
                if (this._connections[cm].line.material.opacity < 0.01) this._connections[cm].line.visible = false;
            }
            for (var di = 0; di < this._dataParticles.length; di++) {
                this._dataParticles[di].mesh.material.opacity *= (1 - t6 * 0.08);
                if (this._dataParticles[di].mesh.material.opacity < 0.01) this._dataParticles[di].mesh.visible = false;
            }
            this._humGlow.material.opacity = 0.12 * (1 - t6);

            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update data flow particles along connections
        for (var dj = 0; dj < this._dataParticles.length; dj++) {
            var dPart = this._dataParticles[dj];
            if (!dPart.active) continue;

            dPart.pathT += dPart.speed * delta;
            if (dPart.pathT > 1) {
                dPart.active = false;
                dPart.mesh.visible = false;
                continue;
            }

            var conn4 = this._connections[dPart.connIdx];
            var fromN5 = this._nodes[conn4.fromIdx];
            var toN5 = this._nodes[conn4.toIdx];

            var pT = dPart.reverse ? (1 - dPart.pathT) : dPart.pathT;
            var px = fromN5.x + (toN5.x - fromN5.x) * pT;
            var py = fromN5.y + (toN5.y - fromN5.y) * pT;
            dPart.mesh.position.set(px, py, 0.03);

            // Fade near endpoints
            var edgeFade = Math.min(dPart.pathT * 5, (1 - dPart.pathT) * 5, 1);
            dPart.mesh.material.opacity = edgeFade * 0.8;
            dPart.mesh.scale.setScalar(0.6 + edgeFade * 0.4);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._nodes) {
            this._nodes.forEach(function(n) {
                scene.remove(n.mesh); n.mesh.geometry.dispose(); n.mesh.material.dispose();
            });
        }
        if (this._connections) {
            this._connections.forEach(function(c) {
                scene.remove(c.line); c.line.geometry.dispose(); c.line.material.dispose();
            });
        }
        if (this._dataParticles) {
            this._dataParticles.forEach(function(d) {
                scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose();
            });
        }
        if (this._humGlow) { scene.remove(this._humGlow); this._humGlow.geometry.dispose(); this._humGlow.material.dispose(); }
        this._nodes = this._connections = this._dataParticles = this._humGlow = null;
    }
};
