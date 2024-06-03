import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <header className="w-full text-center border-b border-slate-700">
        <h1 className="text-4xl uppercase">Ballerz</h1>
        <p>Now community owned!</p>

        <p className="speech-bubble w-64 text-xl text-black p-6 mx-auto mt-12">
          Probably nothing...
        </p>

        <Image
          src="https://ballerz.cloud/images/ballerz/9383/public"
          width={280}
          height={280}
          alt="Baller 9383 - Baller Market Mascot"
          className="mx-auto"
        />
      </header>
    </main>
  );
}
