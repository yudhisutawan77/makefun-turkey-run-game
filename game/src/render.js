// Everything the player sees, drawn on one canvas with plain 2D shapes —
// no images, no fonts loaded from anywhere. The turkey, the farmer, the
// farmyard, the barn and the kitchen, the ovens, the knives, the corn and the
// haystacks are all drawn here, plus the HUD and the title, pause and end
// screens. The logical field is 1280x720; the canvas scales to the window.
import { FIELD, PALETTE, FONT, ESCAPE_DISTANCE, TURKEY } from './config.js';
import { KIND_CORN, KIND_FENCE, KIND_HAY, KIND_KNIFE, KIND_OVEN } from './world.js';
import { FARMER_CHASE, FARMER_SEARCH, FARMER_SLIP } from './farmer.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fitCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    const scale = Math.min(width / FIELD.width, height / FIELD.height);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, (width - FIELD.width * scale) / 2 * dpr, (height - FIELD.height * scale) / 2 * dpr);
  }

  function sky(state) {
    const stage = state.stage;
    const top = stage === 0 ? PALETTE.skyFarm[0] : stage === 1 ? PALETTE.skyBarn[0] : PALETTE.skyKitchen[0];
    const bottom = stage === 0 ? PALETTE.skyFarm[1] : stage === 1 ? PALETTE.skyBarn[1] : PALETTE.skyKitchen[1];
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD.groundY);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.groundY);
    // The low autumn sun and lazy clouds only belong to the farmyard sky;
    // the barn and the kitchen have their own ceilings.
    if (stage !== 0) return;
    ctx.fillStyle = '#fff3c4';
    ellipse(ctx, 1080, 110, 52, 52);
    ctx.fillStyle = 'rgba(255, 246, 224, 0.85)';
    for (const [cx, cy, s] of [[220, 120, 1], [520, 80, 0.7], [820, 150, 0.85]]) {
      ellipse(ctx, cx, cy, 46 * s, 20 * s);
      ellipse(ctx, cx + 34 * s, cy + 6, 34 * s, 16 * s);
    }
  }

  function scenery(state) {
    const scroll = state.distance * 10;
    const ground = state.stage === 0 ? PALETTE.groundFarm : state.stage === 1 ? PALETTE.groundBarn : PALETTE.groundKitchen;
    ctx.fillStyle = ground;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    ctx.fillStyle = PALETTE.dirt;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, 10);
    if (state.stage === 0) {
      // Farmyard: a white fence and a red barn on the horizon, drifting slowly.
      const barnX = 900 - (scroll * 0.25) % 1600;
      ctx.fillStyle = '#b03a2e';
      ctx.fillRect(barnX, 420, 220, 186);
      ctx.fillStyle = '#7e2a20';
      ctx.beginPath();
      ctx.moveTo(barnX - 14, 424);
      ctx.lineTo(barnX + 110, 330);
      ctx.lineTo(barnX + 234, 424);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f5e6c8';
      ctx.fillRect(barnX + 88, 500, 44, 106);
      ctx.strokeStyle = '#f5e6c8';
      ctx.lineWidth = 6;
      for (let index = 0; index < 7; index += 1) {
        const fx = ((index * 190 - scroll * 0.6) % 1400 + 1400) % 1400 - 60;
        ctx.beginPath();
        ctx.moveTo(fx, FIELD.groundY - 34);
        ctx.lineTo(fx, FIELD.groundY);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, FIELD.groundY - 34);
      ctx.lineTo(FIELD.width, FIELD.groundY - 34);
      ctx.stroke();
    } else if (state.stage === 1) {
      // The barn: wooden beams and hanging lanterns.
      ctx.fillStyle = '#4a2f1c';
      for (let index = 0; index < 5; index += 1) {
        ctx.fillRect(index * 300 - (scroll * 0.3 % 300), 0, 26, FIELD.groundY);
      }
      ctx.fillStyle = '#ffcf6e';
      for (const lx of [240, 640, 1040]) {
        ellipse(ctx, lx, 180, 16, 22);
        ctx.fillStyle = 'rgba(255, 207, 110, 0.25)';
        ellipse(ctx, lx, 180, 44, 60);
        ctx.fillStyle = '#ffcf6e';
      }
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(0, 300, FIELD.width, 14);
    } else {
      // The kitchen: chequered tiles and a long table with a roast on it.
      ctx.fillStyle = '#e8dcc0';
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 16; col += 1) {
          if ((row + col) % 2 === 0) ctx.fillRect(col * 80, row * 80, 80, 80);
        }
      }
      ctx.fillStyle = '#7a4a26';
      ctx.fillRect(880, 470, 400, 26);
      ctx.fillRect(920, 496, 22, 110);
      ctx.fillRect(1216, 496, 22, 110);
      // The roast turkey on the table — the fate our turkey is running from.
      ctx.fillStyle = '#a0522d';
      ellipse(ctx, 1080, 452, 62, 26);
      ctx.fillStyle = '#e8a33c';
      ellipse(ctx, 1026, 452, 12, 8);
      ellipse(ctx, 1134, 452, 12, 8);
    }
  }

  function drawHaystack(item) {
    ctx.fillStyle = PALETTE.hayDark;
    ctx.beginPath();
    ctx.moveTo(item.x, item.y + item.height);
    ctx.quadraticCurveTo(item.x + item.width / 2, item.y - 26, item.x + item.width, item.y + item.height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.hay;
    ctx.beginPath();
    ctx.moveTo(item.x + 8, item.y + item.height);
    ctx.quadraticCurveTo(item.x + item.width / 2, item.y - 12, item.x + item.width - 8, item.y + item.height);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.hayDark;
    ctx.lineWidth = 2;
    for (let index = 0; index < 4; index += 1) {
      ctx.beginPath();
      ctx.moveTo(item.x + 16 + index * 20, item.y + item.height - 6);
      ctx.lineTo(item.x + 22 + index * 20, item.y + 26);
      ctx.stroke();
    }
  }

  function drawOven(item, time) {
    const glow = 0.6 + Math.sin(time * 6 + item.slidePhase) * 0.4;
    ctx.fillStyle = `rgba(255, 122, 26, ${0.25 * glow})`;
    ellipse(ctx, item.x + item.width / 2, item.y + item.height / 2, item.width * 0.75, item.height * 0.7);
    ctx.fillStyle = PALETTE.ovenBody;
    roundRect(ctx, item.x, item.y, item.width, item.height, 10);
    ctx.fill();
    ctx.fillStyle = '#2e2e36';
    roundRect(ctx, item.x + 10, item.y + 12, item.width - 20, 44, 6);
    ctx.fill();
    ctx.fillStyle = `rgba(255, ${110 + Math.floor(60 * glow)}, 26, ${0.75 + 0.25 * glow})`;
    ctx.beginPath();
    ctx.moveTo(item.x + 22, item.y + 50);
    ctx.quadraticCurveTo(item.x + 34, item.y + 18, item.x + 48, item.y + 50);
    ctx.quadraticCurveTo(item.x + 62, item.y + 22, item.x + 76, item.y + 50);
    ctx.quadraticCurveTo(item.x + 90, item.y + 24, item.x + item.width - 22, item.y + 50);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d7dce3';
    ctx.fillRect(item.x + 14, item.y + 68, item.width - 28, 6);
    ctx.fillStyle = '#ff5340';
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('HOT!', item.x + item.width / 2, item.y + item.height - 8);
  }

  function drawKnife(item) {
    const stuck = item.stuck > 0;
    ctx.save();
    ctx.translate(item.x + item.width / 2, item.y + item.height / 2);
    if (!stuck) ctx.rotate(0.12);
    ctx.fillStyle = PALETTE.knifeBlade;
    ctx.beginPath();
    ctx.moveTo(-9, -item.height / 2 + 8);
    ctx.lineTo(9, -item.height / 2 + 8);
    ctx.lineTo(9, 6);
    ctx.lineTo(0, item.height / 2 - 14);
    ctx.lineTo(-9, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.knifeHandle;
    roundRect(ctx, -6, item.height / 2 - 16, 12, 18, 4);
    ctx.fill();
    ctx.restore();
  }

  function drawCorn(item, time) {
    const bob = Math.sin(time * 3 + item.x * 0.01) * 4;
    ctx.fillStyle = PALETTE.cornHusk;
    ctx.beginPath();
    ctx.moveTo(item.x + 4, item.y + item.height + bob);
    ctx.lineTo(item.x + 15, item.y + 8 + bob);
    ctx.lineTo(item.x + 26, item.y + item.height + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.corn;
    ellipse(ctx, item.x + 15, item.y + 14 + bob, 11, 15);
    ctx.fillStyle = '#d9a92e';
    ctx.fillRect(item.x + 10, item.y + 8 + bob, 2, 12);
    ctx.fillRect(item.x + 15, item.y + 6 + bob, 2, 14);
    ctx.fillRect(item.x + 20, item.y + 8 + bob, 2, 12);
  }

  function drawFence(item) {
    ctx.strokeStyle = '#e8dcc0';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(item.x, item.y + 12);
    ctx.lineTo(item.x + item.width, item.y + 12);
    ctx.moveTo(item.x, item.y + 32);
    ctx.lineTo(item.x + item.width, item.y + 32);
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(item.x + 8, item.y);
    ctx.lineTo(item.x + 8, item.y + item.height);
    ctx.moveTo(item.x + item.width - 8, item.y);
    ctx.lineTo(item.x + item.width - 8, item.y + item.height);
    ctx.stroke();
  }

  function drawTurkey(turkey, time, hidden) {
    if (hidden) {
      // Only the tail feathers poke out of the haystack — the turkey is hiding.
      ctx.fillStyle = PALETTE.tail[1];
      for (let index = -1; index <= 1; index += 1) {
        ctx.save();
        ctx.translate(turkey.x + turkey.width / 2, FIELD.groundY - 8);
        ctx.rotate(index * 0.35);
        ellipse(ctx, 0, -26, 9, 26);
        ctx.restore();
      }
      return;
    }
    const squash = turkey.landSquash * 0.12;
    const bob = turkey.onGround ? Math.abs(Math.sin(turkey.runPhase)) * 4 : 0;
    const cx = turkey.x + turkey.width / 2;
    const cy = turkey.y + turkey.height - 14 - bob;
    ctx.save();
    if (turkey.invulnerable > 0 && Math.floor(time * 12) % 2 === 0) ctx.globalAlpha = 0.45;
    // Tail fan.
    for (let index = 0; index < 5; index += 1) {
      ctx.fillStyle = PALETTE.tail[index % PALETTE.tail.length];
      ctx.save();
      ctx.translate(cx - 22, cy - 6);
      ctx.rotate(-0.7 + index * 0.35);
      ellipse(ctx, 0, -26, 10, 28);
      ctx.restore();
    }
    // Body.
    ctx.fillStyle = PALETTE.turkeyBody;
    ellipse(ctx, cx, cy, 30 * (1 + squash), 24 * (1 - squash));
    // Wing.
    ctx.fillStyle = PALETTE.turkeyWing;
    ctx.save();
    ctx.translate(cx - 4, cy - 2);
    ctx.rotate(turkey.onGround ? Math.sin(turkey.runPhase) * 0.5 : -0.9);
    ellipse(ctx, -4, 0, 18, 10);
    ctx.restore();
    // Legs.
    ctx.strokeStyle = '#e8a33c';
    ctx.lineWidth = 4;
    const legSwing = turkey.onGround ? Math.sin(turkey.runPhase) * 10 : 6;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 20);
    ctx.lineTo(cx - 8 + legSwing, FIELD.groundY);
    ctx.moveTo(cx + 8, cy + 20);
    ctx.lineTo(cx + 8 - legSwing, FIELD.groundY);
    ctx.stroke();
    // Head, beak and wattle.
    ctx.fillStyle = PALETTE.head;
    ellipse(ctx, cx + 26, cy - 26, 13, 14);
    ctx.fillStyle = PALETTE.beak;
    ctx.beginPath();
    ctx.moveTo(cx + 36, cy - 28);
    ctx.lineTo(cx + 50, cy - 23);
    ctx.lineTo(cx + 36, cy - 19);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.wattle;
    ellipse(ctx, cx + 38, cy - 14, 4, 8);
    ctx.fillStyle = '#222';
    ellipse(ctx, cx + 30, cy - 30, 2.5, 2.5);
    // A dash leaves a little speed-line puff.
    if (turkey.dashing) {
      ctx.strokeStyle = 'rgba(255, 246, 224, 0.7)';
      ctx.lineWidth = 3;
      for (let index = 0; index < 3; index += 1) {
        ctx.beginPath();
        ctx.moveTo(cx - 40 - index * 12, cy - 14 + index * 10);
        ctx.lineTo(cx - 58 - index * 12, cy - 14 + index * 10);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawFarmer(farmer, turkey, time) {
    const fx = turkey.x - farmer.gap;
    if (fx < -140) return;
    const fy = FIELD.groundY;
    const slip = farmer.mode === FARMER_SLIP;
    const search = farmer.mode === FARMER_SEARCH;
    ctx.save();
    if (slip) {
      // Flat on his back, hat over his face, feet in the air — comic timing.
      ctx.translate(fx + 40, fy - 10);
      ctx.rotate(-0.12);
      ctx.fillStyle = PALETTE.farmerOveralls;
      roundRect(ctx, -34, -16, 68, 26, 8);
      ctx.fill();
      ctx.fillStyle = PALETTE.farmerSkin;
      ellipse(ctx, 44, -8, 12, 12);
      ctx.fillStyle = PALETTE.farmerHat;
      ellipse(ctx, 44, -16, 14, 6);
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-28, -14);
      ctx.lineTo(-44, -34);
      ctx.moveTo(28, -14);
      ctx.lineTo(44, -34);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `bold 20px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('★', 0, -52);
      ctx.restore();
      return;
    }
    const runSwing = Math.sin(farmer.runPhase) * 9;
    const bob = Math.abs(Math.sin(farmer.runPhase)) * 3;
    // Legs.
    ctx.strokeStyle = PALETTE.farmerOveralls;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(fx + 30, fy - 46);
    ctx.lineTo(fx + 30 + runSwing, fy);
    ctx.moveTo(fx + 52, fy - 46);
    ctx.lineTo(fx + 52 - runSwing, fy);
    ctx.stroke();
    // Body: overalls over a checked shirt.
    ctx.fillStyle = PALETTE.farmerShirt;
    roundRect(ctx, fx + 14, fy - 96 + bob * 0, 62, 54, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.farmerOveralls;
    ctx.fillRect(fx + 22, fy - 96, 46, 54);
    ctx.fillStyle = '#d9b36a';
    ctx.fillRect(fx + 22, fy - 96, 46, 8);
    // Arms reaching forward, one holding the pitchfork.
    ctx.strokeStyle = PALETTE.farmerShirt;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(fx + 66, fy - 84);
    ctx.lineTo(fx + 92, fy - 66);
    ctx.stroke();
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(fx + 92, fy - 110);
    ctx.lineTo(fx + 98, fy - 40);
    ctx.stroke();
    ctx.strokeStyle = '#d7dce3';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fx + 88, fy - 112);
    ctx.lineTo(fx + 84, fy - 124);
    ctx.moveTo(fx + 93, fy - 113);
    ctx.lineTo(fx + 91, fy - 126);
    ctx.moveTo(fx + 98, fy - 112);
    ctx.lineTo(fx + 98, fy - 126);
    ctx.stroke();
    // Head: red face, big moustache, straw hat.
    ctx.fillStyle = PALETTE.farmerSkin;
    ellipse(ctx, fx + 46, fy - 112, 17, 18);
    ctx.fillStyle = '#e5534b';
    ellipse(ctx, fx + 46, fy - 100, 15, 5);
    ctx.fillStyle = '#5a3a1a';
    ellipse(ctx, fx + 52, fy - 106, 9, 4);
    ctx.fillStyle = '#222';
    ellipse(ctx, fx + (search ? 52 : 56), fy - 116, 2.5, 2.5);
    ctx.fillStyle = PALETTE.farmerHat;
    ellipse(ctx, fx + 46, fy - 126, 26, 7);
    ctx.fillRect(fx + 32, fy - 140, 28, 16);
    // "!" when he is right behind the turkey.
    if (farmer.gap < 130 && farmer.mode === FARMER_CHASE) {
      ctx.fillStyle = PALETTE.danger;
      ctx.font = `bold 34px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('!', fx + 46, fy - 158 + Math.sin(time * 8) * 3);
    }
    ctx.restore();
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.colour;
      ellipse(ctx, p.x, p.y, p.size, p.size * 0.6);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best) {
    ctx.fillStyle = 'rgba(43, 33, 24, 0.82)';
    roundRect(ctx, 16, 14, 700, 64, 12);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'left';
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillText(`SCORE ${state.score}`, 34, 42);
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(`${Math.floor(state.distance)} m`, 34, 68);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT}`;
    ctx.fillText(state.stageName, 300, 40);
    ctx.fillText(`BEST ${Math.floor(best)} m`, 300, 66);
    // Lives as hearts.
    for (let index = 0; index < 3; index += 1) {
      const hx = 600 + index * 36;
      ctx.fillStyle = index < state.lives ? '#ff5340' : 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.moveTo(hx, 52);
      ctx.bezierCurveTo(hx - 14, 36, hx - 26, 48, hx, 64);
      ctx.bezierCurveTo(hx + 26, 48, hx + 14, 36, hx, 52);
      ctx.fill();
    }
    // Stamina bar for the gobble dash.
    ctx.fillStyle = 'rgba(43, 33, 24, 0.82)';
    roundRect(ctx, 16, 86, 220, 18, 9);
    ctx.fill();
    ctx.fillStyle = '#ffb02e';
    const staminaWidth = 212 * (state.turkey.stamina / TURKEY.staminaMax);
    if (staminaWidth > 4) {
      roundRect(ctx, 20, 90, staminaWidth, 10, 5);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 12px ${FONT}`;
    ctx.fillText('GOBBLE DASH (SHIFT)', 246, 101);
    // Escape progress: a little dinner plate that fills up.
    const progress = Math.min(1, state.distance / ESCAPE_DISTANCE);
    ctx.fillStyle = 'rgba(43, 33, 24, 0.82)';
    roundRect(ctx, FIELD.width - 316, 14, 300, 64, 12);
    ctx.fill();
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT}`;
    ctx.fillText('ESCAPE', FIELD.width - 298, 40);
    ctx.fillStyle = '#7fae4e';
    roundRect(ctx, FIELD.width - 298, 48, 264 * progress, 14, 7);
    ctx.fill();
    ctx.strokeStyle = PALETTE.text;
    ctx.lineWidth = 2;
    roundRect(ctx, FIELD.width - 298, 48, 264, 14, 7);
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText(`${Math.floor(progress * 100)}%`, FIELD.width - 92, 40);
    // Warnings.
    if (state.spotted) {
      ctx.fillStyle = PALETTE.danger;
      ctx.font = `bold 30px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('! HE SEES YOU — RUN !', FIELD.width / 2, 140);
    }
    if (state.turkey.hidden) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 24px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('… hiding in the hay …', FIELD.width / 2, 140);
    }
  }

  function drawButton(label, x, y, w, h) {
    ctx.fillStyle = '#e8a33c';
    roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = '#7a4a26';
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, w, h, 12);
    ctx.stroke();
    ctx.fillStyle = '#3a2a1a';
    ctx.font = `bold 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 9);
    return { x, y, w, h };
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(43, 33, 24, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffb02e';
    ctx.font = `bold 96px ${FONT}`;
    ctx.fillText('GOBBLE DASH', FIELD.width / 2, 210);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 40px ${FONT}`;
    ctx.fillText('— TURKEY ESCAPE —', FIELD.width / 2, 268);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `22px ${FONT}`;
    ctx.fillText('Thanksgiving is coming. The farmer is coming faster.', FIELD.width / 2, 318);
    ctx.fillText('Run the farmyard, the barn and the kitchen — and do not end up on the table.', FIELD.width / 2, 350);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `20px ${FONT}`;
    ctx.fillText('SPACE / ↑ jump      SHIFT gobble dash      H hide in a haystack', FIELD.width / 2, 404);
    ctx.fillText('Grab corn for points and stamina. Dodge the ovens. Mind the falling knives.', FIELD.width / 2, 434);
    if (best > 0) {
      ctx.fillStyle = '#ffb02e';
      ctx.font = `bold 22px ${FONT}`;
      ctx.fillText(`Best escape so far: ${Math.floor(best)} m`, FIELD.width / 2, 472);
    }
    return { start: drawButton('▶  START THE ESCAPE', FIELD.width / 2 - 190, 510, 380, 64) };
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(43, 33, 24, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 64px ${FONT}`;
    ctx.fillText('PAUSED', FIELD.width / 2, 330);
    ctx.font = `22px ${FONT}`;
    ctx.fillText('Press P or click to keep running.', FIELD.width / 2, 380);
    return { resume: drawButton('RESUME', FIELD.width / 2 - 110, 420, 220, 56) };
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(43, 33, 24, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    const escaped = state.escaped;
    ctx.fillStyle = escaped ? '#7fae4e' : PALETTE.danger;
    ctx.font = `bold 84px ${FONT}`;
    ctx.fillText(escaped ? 'ESCAPED!' : 'CAUGHT!', FIELD.width / 2, 230);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `26px ${FONT}`;
    ctx.fillText(
      escaped
        ? 'You outran the farmer, the ovens and the knives. Thanksgiving is cancelled — for this turkey.'
        : 'The farmer has you. The oven is already warm… but there is always next Thanksgiving.',
      FIELD.width / 2, 290,
    );
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText(`Distance ${Math.floor(state.distance)} m   •   Score ${state.score}`, FIELD.width / 2, 350);
    ctx.fillStyle = '#ffb02e';
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillText(`Best escape: ${Math.floor(best)} m`, FIELD.width / 2, 392);
    return { restart: drawButton('↻  RUN AGAIN', FIELD.width / 2 - 150, 440, 300, 64) };
  }

  function draw(state, screen, best, time) {
    fitCanvas();
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    sky(state);
    scenery(state);
    // Draw order: haystacks behind the turkey, then the rest, then the farmer.
    for (const item of state.obstacles) {
      if (!item.active || item.kind !== KIND_HAY) continue;
      drawHaystack(item);
    }
    for (const item of state.obstacles) {
      if (!item.active) continue;
      if (item.kind === KIND_OVEN) drawOven(item, time);
      else if (item.kind === KIND_KNIFE) drawKnife(item);
      else if (item.kind === KIND_CORN) drawCorn(item, time);
      else if (item.kind === KIND_FENCE) drawFence(item);
    }
    drawFarmer(state.farmer, state.turkey, time);
    drawTurkey(state.turkey, time, state.turkey.hidden);
    drawParticles(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best);
    if (screen === SCREEN_TITLE) return { buttons: drawTitle(state, best) };
    if (screen === SCREEN_PAUSED) return { buttons: drawPaused() };
    if (screen === SCREEN_OVER) return { buttons: drawOver(state, best) };
    return { buttons: {} };
  }

  return { draw, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER };
}
