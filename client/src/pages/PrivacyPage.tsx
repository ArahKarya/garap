import { BRANDING } from '@garap/shared';
import { LegalLayout, type LegalSection } from './legal/LegalLayout';

const EFFECTIVE_DATE = '5 Juni 2026';

const SECTIONS: LegalSection[] = [
  {
    heading: 'Data yang Kami Kumpulkan',
    body: (
      <>
        <p>Kami mengumpulkan data berikut untuk menjalankan Layanan:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">Data akun:</strong> alamat email dan nama
            yang Anda berikan saat mendaftar.
          </li>
          <li>
            <strong className="text-foreground">Konten yang Anda buat:</strong> task, project, note,
            link, dokumen yang diunggah, dan referensi, beserta tag dan metadata terkait.
          </li>
          <li>
            <strong className="text-foreground">Data teknis:</strong> log aktivitas dasar (audit
            log) untuk keamanan dan pemecahan masalah.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: 'Cara Kami Menggunakan Data',
    body: (
      <>
        <p>Data Anda digunakan untuk:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>menyediakan, mengoperasikan, dan memelihara Layanan;</li>
          <li>mengautentikasi akun dan menjaga keamanan;</li>
          <li>menampilkan dan menyinkronkan konten yang Anda buat;</li>
          <li>mengirim notifikasi terkait (mis. pengingat tenggat task) bila Anda mengaktifkannya.</li>
        </ul>
        <p>
          Kami <strong className="text-foreground">tidak</strong> menjual data pribadi Anda dan
          tidak menggunakan konten Anda untuk iklan.
        </p>
      </>
    ),
  },
  {
    heading: 'Penyimpanan dan Keamanan',
    body: (
      <p>
        Data disimpan pada server basis data yang dikelola oleh {BRANDING.LEGAL_NAME}. Kami
        menerapkan langkah pengamanan yang wajar — termasuk enkripsi token, kontrol akses berbasis
        peran, dan pencatatan audit. Meski demikian, tidak ada sistem yang sepenuhnya bebas risiko,
        dan kami tidak dapat menjamin keamanan mutlak.
      </p>
    ),
  },
  {
    heading: 'Cookie dan Sesi',
    body: (
      <p>
        Kami menggunakan token sesi (access token dan refresh token) yang disimpan pada peramban
        Anda untuk menjaga Anda tetap masuk. Token ini bersifat fungsional dan diperlukan agar
        Layanan berjalan. Kami tidak menggunakan cookie pelacakan untuk iklan.
      </p>
    ),
  },
  {
    heading: 'Berbagi dengan Pihak Ketiga',
    body: (
      <>
        <p>Kami hanya membagikan data terbatas kepada penyedia yang mendukung Layanan, yaitu:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Penyedia infrastruktur untuk hosting dan pengiriman email notifikasi, bila relevan.
          </li>
        </ul>
        <p>Kami dapat mengungkapkan data jika diwajibkan oleh hukum yang berlaku.</p>
      </>
    ),
  },
  {
    heading: 'Hak Anda',
    body: (
      <>
        <p>Anda memiliki kendali atas data Anda:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">Ekspor:</strong> Anda dapat mengekspor konten Anda
            menggunakan fitur backup yang tersedia di dalam aplikasi.
          </li>
          <li>
            <strong className="text-foreground">Hapus:</strong> Anda dapat menghapus konten melalui
            fitur Trash (penghapusan lunak) dan menghapus permanen dari sana. Anda juga dapat meminta
            penghapusan akun dan seluruh data terkait.
          </li>
          <li>
            <strong className="text-foreground">Akses dan koreksi:</strong> Anda dapat melihat dan
            memperbarui data konten Anda kapan saja melalui aplikasi.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: 'Retensi Data',
    body: (
      <p>
        Kami menyimpan data Anda selama akun aktif. Item yang dihapus melalui Trash dapat tersimpan
        sementara sebelum dihapus permanen. Setelah akun dihapus, data terkait akan dihapus dalam
        jangka waktu yang wajar, kecuali bila penyimpanan diwajibkan oleh hukum.
      </p>
    ),
  },
  {
    heading: 'Perubahan Kebijakan',
    body: (
      <p>
        Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Perubahan akan
        dipublikasikan pada halaman ini beserta tanggal berlaku yang diperbarui.
      </p>
    ),
  },
  {
    heading: 'Kontak',
    body: (
      <p>
        Pertanyaan terkait privasi atau permintaan terkait data pribadi Anda dapat dikirim ke{' '}
        <a href="mailto:yayang.nugroho.s@gmail.com" className="text-primary hover:underline">
          yayang.nugroho.s@gmail.com
        </a>
        .
      </p>
    ),
  },
];

export function PrivacyPage() {
  return (
    <LegalLayout
      title="Kebijakan Privasi"
      effectiveDate={EFFECTIVE_DATE}
      intro={
        <p>
          Kebijakan Privasi ini menjelaskan bagaimana {BRANDING.APP_NAME}, yang dioperasikan oleh{' '}
          {BRANDING.LEGAL_NAME}, mengumpulkan, menggunakan, dan melindungi data Anda saat menggunakan
          Layanan.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
