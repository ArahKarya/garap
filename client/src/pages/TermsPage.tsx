import { BRANDING } from '@garap/shared';
import { LegalLayout, type LegalSection } from './legal/LegalLayout';

const EFFECTIVE_DATE = '5 Juni 2026';

const SECTIONS: LegalSection[] = [
  {
    heading: 'Penerimaan Ketentuan',
    body: (
      <p>
        Dengan mengakses atau menggunakan {BRANDING.APP_NAME} ("Layanan"), Anda menyetujui untuk
        terikat pada Ketentuan Layanan ini. Jika Anda tidak setuju dengan sebagian atau seluruh
        ketentuan, mohon untuk tidak menggunakan Layanan. Layanan dioperasikan oleh{' '}
        {BRANDING.LEGAL_NAME}.
      </p>
    ),
  },
  {
    heading: 'Akun',
    body: (
      <>
        <p>
          Untuk menggunakan Layanan, Anda masuk menggunakan akun Google. Anda bertanggung jawab
          penuh menjaga kerahasiaan kredensial akun Google Anda serta seluruh aktivitas yang
          terjadi di bawah akun tersebut.
        </p>
        <p>
          Anda menyatakan bahwa informasi yang Anda berikan akurat dan bahwa Anda berusia minimal
          18 tahun atau telah memenuhi syarat usia dewasa menurut hukum yang berlaku.
        </p>
      </>
    ),
  },
  {
    heading: 'Kewajiban Pengguna',
    body: (
      <>
        <p>
          Anda bertanggung jawab atas seluruh konten yang Anda buat, unggah, atau simpan melalui
          Layanan — termasuk task, project, note, link, dokumen, dan referensi. Anda menjamin bahwa
          konten tersebut tidak melanggar hak pihak ketiga maupun hukum yang berlaku.
        </p>
        <p>
          Anda bertanggung jawab membuat cadangan (backup) atas data penting Anda menggunakan
          fitur ekspor yang disediakan.
        </p>
      </>
    ),
  },
  {
    heading: 'Larangan',
    body: (
      <>
        <p>Anda dilarang menggunakan Layanan untuk:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>melanggar hukum, hak kekayaan intelektual, atau hak privasi pihak lain;</li>
          <li>mengunggah malware, kode berbahaya, atau konten yang melanggar hukum;</li>
          <li>
            mengakses sistem secara tidak sah, melakukan rekayasa balik, atau mengganggu operasional
            Layanan;
          </li>
          <li>menyalahgunakan sumber daya, mengirim spam, atau membebani sistem secara berlebihan.</li>
        </ul>
      </>
    ),
  },
  {
    heading: 'Hak Kekayaan Intelektual',
    body: (
      <p>
        Layanan, termasuk perangkat lunak, desain, dan merek {BRANDING.APP_NAME}, merupakan milik{' '}
        {BRANDING.LEGAL_NAME} dan dilindungi hukum. Anda tetap memiliki seluruh hak atas konten
        yang Anda buat. Anda memberikan kami lisensi terbatas untuk menyimpan dan memproses konten
        Anda semata-mata untuk menjalankan Layanan.
      </p>
    ),
  },
  {
    heading: 'Ketersediaan dan Perubahan Layanan',
    body: (
      <p>
        Kami dapat mengubah, menangguhkan, atau menghentikan sebagian maupun seluruh Layanan kapan
        saja. Kami berupaya menjaga ketersediaan Layanan, namun tidak menjamin Layanan bebas dari
        gangguan atau kesalahan.
      </p>
    ),
  },
  {
    heading: 'Pembatasan Tanggung Jawab',
    body: (
      <p>
        Layanan disediakan "sebagaimana adanya" (as is) tanpa jaminan apa pun. Sepanjang diizinkan
        hukum yang berlaku, {BRANDING.LEGAL_NAME} tidak bertanggung jawab atas kerugian tidak
        langsung, insidental, atau konsekuensial — termasuk kehilangan data, kehilangan keuntungan,
        atau gangguan usaha — yang timbul dari penggunaan atau ketidakmampuan menggunakan Layanan.
      </p>
    ),
  },
  {
    heading: 'Penghentian',
    body: (
      <p>
        Kami dapat menangguhkan atau menghentikan akses Anda apabila Anda melanggar ketentuan ini.
        Anda dapat berhenti menggunakan Layanan kapan saja dan meminta penghapusan data sesuai
        Kebijakan Privasi.
      </p>
    ),
  },
  {
    heading: 'Perubahan Ketentuan',
    body: (
      <p>
        Kami dapat memperbarui Ketentuan Layanan ini dari waktu ke waktu. Perubahan berlaku sejak
        dipublikasikan pada halaman ini. Dengan terus menggunakan Layanan setelah perubahan, Anda
        dianggap menyetujui ketentuan yang diperbarui.
      </p>
    ),
  },
  {
    heading: 'Hukum yang Berlaku',
    body: (
      <p>
        Ketentuan ini diatur dan ditafsirkan berdasarkan hukum Republik Indonesia. Setiap sengketa
        yang timbul akan diselesaikan sesuai yurisdiksi pengadilan di Indonesia.
      </p>
    ),
  },
  {
    heading: 'Kontak',
    body: (
      <p>
        Pertanyaan terkait Ketentuan Layanan dapat dikirim ke{' '}
        <a href="mailto:yayang.nugroho.s@gmail.com" className="text-primary hover:underline">
          yayang.nugroho.s@gmail.com
        </a>
        .
      </p>
    ),
  },
];

export function TermsPage() {
  return (
    <LegalLayout
      title="Ketentuan Layanan"
      effectiveDate={EFFECTIVE_DATE}
      intro={
        <p>
          Ketentuan Layanan ini mengatur penggunaan aplikasi {BRANDING.APP_NAME}, sebuah aplikasi
          produktivitas personal ("second brain") untuk mengelola task, project, note, link,
          dokumen, dan referensi.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
