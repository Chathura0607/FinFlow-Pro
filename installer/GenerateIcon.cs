using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

class IconGenerator
{
    static void Main()
    {
        int[] sizes = new int[] { 16, 32, 48, 64, 128, 256 };
        Bitmap[] bitmaps = new Bitmap[sizes.Length];

        for (int i = 0; i < sizes.Length; i++)
        {
            bitmaps[i] = CreateAppIcon(sizes[i]);
        }

        SaveIcon(bitmaps, "app.ico");
        SaveIcon(bitmaps, "installer\\app.ico");
        Console.WriteLine("app.ico generated successfully!");
    }

    static Bitmap CreateAppIcon(int size)
    {
        Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.Clear(Color.Transparent);

            float cornerRadius = size * 0.22f;
            RectangleF rect = new RectangleF(size * 0.04f, size * 0.04f, size * 0.92f, size * 0.92f);

            // Rounded rectangle path
            using (GraphicsPath path = GetRoundedRect(rect, cornerRadius))
            {
                // Background Gradient (Deep Indigo to Vibrant Purple)
                using (LinearGradientBrush brush = new LinearGradientBrush(
                    rect,
                    Color.FromArgb(126, 20, 255), // #7e14ff
                    Color.FromArgb(14, 165, 233), // #0ea5e9
                    LinearGradientMode.ForwardDiagonal))
                {
                    g.FillPath(brush, path);
                }

                // Border highlight
                using (Pen pen = new Pen(Color.FromArgb(100, 255, 255, 255), size * 0.03f))
                {
                    g.DrawPath(pen, path);
                }
            }

            // Draw stylish "F" symbol and upward financial trend arrow
            using (Font font = new Font("Arial", size * 0.46f, FontStyle.Bold, GraphicsUnit.Pixel))
            using (SolidBrush textBrush = new SolidBrush(Color.White))
            {
                StringFormat sf = new StringFormat
                {
                    Alignment = StringAlignment.Center,
                    LineAlignment = StringAlignment.Center
                };
                g.DrawString("F", font, textBrush, new RectangleF(0, size * 0.02f, size * 0.78f, size), sf);
            }

            // Upward arrow / graph pulse in cyan
            using (Pen arrowPen = new Pen(Color.FromArgb(56, 189, 248), Math.Max(2f, size * 0.08f)))
            {
                arrowPen.StartCap = LineCap.Round;
                arrowPen.EndCap = LineCap.RoundAnchor;
                g.DrawLine(arrowPen, size * 0.58f, size * 0.72f, size * 0.82f, size * 0.28f);
            }
        }
        return bmp;
    }

    static GraphicsPath GetRoundedRect(RectangleF bounds, float radius)
    {
        float diameter = radius * 2;
        GraphicsPath path = new GraphicsPath();
        path.AddArc(bounds.X, bounds.Y, diameter, diameter, 180, 90);
        path.AddArc(bounds.Right - diameter, bounds.Y, diameter, diameter, 270, 90);
        path.AddArc(bounds.Right - diameter, bounds.Bottom - diameter, diameter, diameter, 0, 90);
        path.AddArc(bounds.X, bounds.Bottom - diameter, diameter, diameter, 90, 90);
        path.CloseFigure();
        return path;
    }

    static void SaveIcon(Bitmap[] bitmaps, string outputPath)
    {
        using (FileStream fs = new FileStream(outputPath, FileMode.Create))
        using (BinaryWriter bw = new BinaryWriter(fs))
        {
            // ICONHEADER
            bw.Write((short)0); // Reserved
            bw.Write((short)1); // Type 1 = ICO
            bw.Write((short)bitmaps.Length); // Count

            int offset = 6 + (16 * bitmaps.Length);
            byte[][] pngBuffers = new byte[bitmaps.Length][];

            for (int i = 0; i < bitmaps.Length; i++)
            {
                using (MemoryStream ms = new MemoryStream())
                {
                    bitmaps[i].Save(ms, ImageFormat.Png);
                    pngBuffers[i] = ms.ToArray();
                }
            }

            for (int i = 0; i < bitmaps.Length; i++)
            {
                Bitmap b = bitmaps[i];
                byte width = (byte)(b.Width >= 256 ? 0 : b.Width);
                byte height = (byte)(b.Height >= 256 ? 0 : b.Height);

                bw.Write(width);
                bw.Write(height);
                bw.Write((byte)0); // Colors
                bw.Write((byte)0); // Reserved
                bw.Write((short)1); // Planes
                bw.Write((short)32); // BPP
                bw.Write(pngBuffers[i].Length); // Size
                bw.Write(offset); // Offset

                offset += pngBuffers[i].Length;
            }

            for (int i = 0; i < bitmaps.Length; i++)
            {
                bw.Write(pngBuffers[i]);
            }
        }
    }
}
