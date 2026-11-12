"""
Taskstick Icon Generator
Creates 'Fan' + 'Task' + 'Stick' icons for PWA, Web & Desktop.
Outputs:
  - icon-512.png (PWA Splash & Manifest)
  - icon-192.png (PWA Launcher)
  - apple-touch-icon.png (180x180)
  - favicon.ico (Multi-size: 16, 32, 48, 64)
  - favicon-32.png
"""

import os
from PIL import Image, ImageDraw, ImageFilter

def create_taskstick_base(size=512, zoom=1.26):
    # Render at 2x resolution for clean Lanczos downsampling
    render_size = size * 2
    scale = size / 512.0
    img = Image.new('RGBA', (render_size, render_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Dark Modern Slate/Indigo Squircle Container (#0F172A -> #1E1B4B)
    # pad = int(24 * 2 * scale)
    # radius = int(96 * 2 * scale)
    # bg_box = [pad, pad, render_size - pad, render_size - pad]
    # draw.rounded_rectangle(bg_box, radius=radius, fill=(15, 23, 42, 255), outline=(51, 65, 85, 255), width=int(4 * 2 * scale))
    
    # # Subtle inner brand glow
    # draw.rounded_rectangle([pad + 6, pad + 6, render_size - pad - 6, render_size - pad - 6],
    #                        radius=radius - 6, outline=(99, 102, 241, 70), width=int(2 * 2 * scale))

    note_w = int(205 * 2 * scale * zoom)
    note_h = int(205 * 2 * scale * zoom)
    note_radius = int(22 * 2 * scale * zoom)
    # Vertically balanced center for the fanned composition
    cx = render_size // 2
    cy = int(render_size * 0.54)

    def draw_single_note(color, angle_deg, has_lines=False, is_front=False):
        n_w = note_w + int(60 * zoom)
        n_h = note_h + int(60 * zoom)
        card = Image.new('RGBA', (n_w, n_h), (0, 0, 0, 0))
        c_draw = ImageDraw.Draw(card)

        # Note bounding box
        bx0, by0 = int(30 * zoom), int(24 * zoom)
        bx1, by1 = bx0 + note_w, by0 + note_h
        box = [bx0, by0, bx1, by1]

        # Note Base
        c_draw.rounded_rectangle(box, radius=note_radius, fill=color)

        # "STICK": Translucent top adhesive strip
        adhesive_color = (
            min(255, int(color[0] * 1.15)),
            min(255, int(color[1] * 1.15)),
            min(255, int(color[2] * 1.15)),
            190
        )
        adh_h = int(26 * 2 * scale * zoom)
        adh_y = by0 - adh_h // 4  # Slightly pull adhesive up
        c_draw.rounded_rectangle([bx0, adh_y, bx1, adh_y + adh_h], radius=note_radius, fill=adhesive_color)
        c_draw.rectangle([bx0, by0 + int(14 * 2 * scale), bx1, by0 + int(26 * 2 * scale)], fill=adhesive_color)

        # "FAN": Subtask lines indicating a checklist
        if has_lines:
            line_col = (color[0] // 2, color[1] // 2, color[2] // 2, 85)
            lw = int(4.5 * 2 * scale * zoom)
            y_start = by0 + int(52 * 2 * scale * zoom)
            c_draw.rounded_rectangle([bx0 + int(28 * 2 * scale * zoom), y_start, 
                                     bx1 - int(28 * 2 * scale * zoom), y_start + lw], radius=lw // 2, fill=line_col)
            c_draw.rounded_rectangle([bx0 + int(28 * 2 * scale * zoom), y_start + int(26 * 2 * scale * zoom), 
                                     bx1 - int(60 * 2 * scale * zoom), y_start + int(26 * 2 * scale * zoom) + lw], radius=lw // 2, fill=line_col)
            c_draw.rounded_rectangle([bx0 + int(28 * 2 * scale * zoom), y_start + int(52 * 2 * scale * zoom), 
                                     bx1 - int(45 * 2 * scale * zoom), y_start + int(52 * 2 * scale * zoom) + lw], radius=lw // 2, fill=line_col)
        if is_front:
            # "STICK": Dog-ear fold on bottom-right corner
            peel = int(38 * 2 * scale * zoom)
            c_draw.polygon([(bx1 - peel, by1), (bx1, by1 - peel), (bx1 - peel, by1 - peel)], fill=(int(color[0] * 0.75), int(color[1] * 0.75), int(color[2] * 0.75), 255))
            c_draw.polygon([(bx1 - peel, by1), (bx1, by1 - peel), (bx1, by1)], fill=(0, 0, 0, 0))
            c_draw.polygon([(bx1 - peel, by1), (bx1, by1 - peel), (bx1 - peel + 4, by1 - peel + 4)], fill=(255, 255, 255, 130))

            # "TASK": Circular completion emblem with checkmark (✓)
            badge_r = int(37 * 2 * scale * zoom)
            badge_cx = bx0 + note_w // 2
            badge_cy = by0 + note_h // 2 + int(10 * 2 * scale * zoom)

            c_draw.ellipse([badge_cx - badge_r, badge_cy - badge_r, badge_cx + badge_r, badge_cy + badge_r],
                           fill=(16, 185, 129, 255), outline=(255, 255, 255, 245), width=int(4.5 * 2 * scale * zoom))

            # Bold checkmark
            p1 = (badge_cx - int(15 * 2 * scale * zoom), badge_cy - int(1 * 2 * scale * zoom))
            p2 = (badge_cx - int(4 * 2 * scale * zoom), badge_cy + int(12 * 2 * scale * zoom))
            p3 = (badge_cx + int(17 * 2 * scale * zoom), badge_cy - int(11 * 2 * scale * zoom))
            c_draw.line([p1, p2, p3], fill=(255, 255, 255, 255), width=int(7 * 2 * scale * zoom), joint="curve")

        return card.rotate(angle_deg, resample=Image.Resampling.BICUBIC, expand=True)

    # 1. Back Left note ("FAN" element - Sky Cyan: #38BDF8)
    note_left = draw_single_note((56, 189, 248, 240), angle_deg=20, has_lines=True)
    # 2. Back Right note ("FAN" element - Coral Rose: #FB7185)
    note_right = draw_single_note((251, 113, 133, 240), angle_deg=-20, has_lines=True)
    # 3. Center Foreground note ("STICK" + "TASK" - Golden Amber: #FBBF24)
    note_center = draw_single_note((251, 191, 36, 255), angle_deg=0, is_front=True)

    # Composite layers
    nl_w, nl_h = note_left.size
    img.alpha_composite(note_left, (cx - nl_w // 2 - int(60 * 2 * scale), cy - nl_h // 2 - int(18 * 2 * scale)))

    nr_w, nr_h = note_right.size
    img.alpha_composite(note_right, (cx - nr_w // 2 + int(60 * 2 * scale), cy - nr_h // 2 - int(18 * 2 * scale)))

    nc_w, nc_h = note_center.size
    img.alpha_composite(note_center, (cx - nc_w // 2, cy - nc_h // 2 + int(10 * 2 * scale)))

    # Lanczos downsampling to target size
    return img.resize((size, size), Image.Resampling.LANCZOS)

def generate_all_icons(output_dir="."):
    os.makedirs(output_dir, exist_ok=True)
    print(f"Generating Taskstick icons in '{output_dir}'...")

    # PWA High-Resolution Icons
    icon_512 = create_taskstick_base(512)
    icon_512.save(os.path.join(output_dir, 'icon-512.png'), format='PNG')
    print("  -> icon-512.png created")

    icon_192 = icon_512.resize((192, 192), Image.Resampling.LANCZOS)
    icon_192.save(os.path.join(output_dir, 'icon-192.png'), format='PNG')
    print("  -> icon-192.png created")

    # Apple Touch Icon (180x180)
    apple_icon = icon_512.resize((180, 180), Image.Resampling.LANCZOS)
    apple_icon.save(os.path.join(output_dir, 'apple-touch-icon.png'), format='PNG')
    print("  -> apple-touch-icon.png created")

    # Favicon 32x32
    fav_32 = icon_512.resize((32, 32), Image.Resampling.LANCZOS)
    fav_32.save(os.path.join(output_dir, 'favicon-32.png'), format='PNG')

    # Multi-resolution favicon.ico
    fav_16 = icon_512.resize((16, 16), Image.Resampling.LANCZOS)
    fav_48 = icon_512.resize((48, 48), Image.Resampling.LANCZOS)
    fav_64 = icon_512.resize((64, 64), Image.Resampling.LANCZOS)
    fav_16.save(
        os.path.join(output_dir, 'favicon.ico'),
        format='ICO',
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
        append_images=[fav_32, fav_48, fav_64]
    )
    print("  -> favicon.ico created (16x16, 32x32, 48x48, 64x64)")
    print("All icons successfully generated!")

if __name__ == '__main__':
    icons_dir = r'c:\Dev\Taskstick\public\icons'
    generate_all_icons(icons_dir)
    
    # Also place favicon.ico directly at the root of public/ for standard browser root access
    import shutil
    shutil.copy(os.path.join(icons_dir, 'favicon.ico'), r'c:\Dev\Taskstick\public\favicon.ico')
    print("  -> copied favicon.ico to public root")