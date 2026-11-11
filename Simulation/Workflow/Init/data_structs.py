from pydantic import BaseModel
from typing import Optional
class GatewayPolicy(BaseModel):
    ExpectedInterval : int
    GracePeriod : int

class Actors(BaseModel):
    Owner : str
    DAOMembers: list[str]
    Gateways : list[str]
    Relayers : list[str]
    RelayersGatewaysBinaryMatrix : list[list[int]]
    GatewayPolicies : Optional[dict[str,GatewayPolicy]]






class FacilityEntry(BaseModel):
    Name : str
    Location : str
    SectorType : str
    Logo : str
    ContractsSigned : list[str]
    actors : Actors
    LandingPageURI : str


class Candidate(BaseModel):
    Wallet : str
    IsCompliant : bool # this means if the candidate really signed the compliance contract or not, if he didnt sign, we're not allowed to vote on him

class FullConfig(BaseModel):
    Facilities : list[FacilityEntry]
    Candidates : list[Candidate]


class ExampleFacilityInfo(BaseModel):
    Name : str
    SectorType: str
    Location : str
    Logo_IPFS : str
    LandingPageURI : str
    ContractsSigned : list[int] # binary list of this order : ["assessment_disclosure" , "incident_disclosure" , "inspection_signed_by_facility", "key_management", "measurement_transparency"]
    min_response_interval : Optional[int] = 0
    

contracts_in_order = [
    "bafkreidglsdrujbietvdp4hjxcsecwn7rxfidlm5f7l42uyudiapeadzhy",
    "bafkreieh2xx3cvhg7wdntzifj53tzgdhdommsgogasbsrvuwaj272ompj4",
    "bafkreiazoh3pzxb7xkpfpahx2homftykipjwsnyxy6fojlixycwxmexc6e",
    "bafkreiebyahgas7fcbkn5l5btbyy4diegstg6vymn7rkdoqwkljvywegcy",
    "bafkreib4z6m55m7h43baf6vrpre6wbobmmkv4joqgvwou22dui6sdbtdji"
]


facility_examples = [
    ExampleFacilityInfo(Name="Atlas Point Nuclear Generating Station",ContractsSigned=[1,1,1,1,1] ,SectorType="Nuclear Reactor", Location="Pickering, Ontario, Canada", Logo_IPFS="bafkreiahuey6bj56cemwkr3jg2gjwkpch4a5rdjgljfz25eqefsziokxte", min_response_interval=10*60, LandingPageURI="https://misty-silence-e1cd.joabichou788.workers.dev/"),
    ExampleFacilityInfo(Name="Nimbus DC-04", SectorType="Data Center",ContractsSigned=[0,1,1,0,0] , Location="Ashburn, Virginia, USA", Logo_IPFS="bafkreih4fcekdf5hqxsme7ghafcoawoslsvy5747wql4kufhe2rwtndazm" , LandingPageURI = "https://super-haze-657c.joabichou788.workers.dev/"),
    ExampleFacilityInfo(Name="AeroVance A320 Fleet", SectorType="Aircraft",ContractsSigned=[0,1,1,0,0] , Location="Toulouse, France",Logo_IPFS="bafkreieopfjq7r33c743qtud4zomwyycottmmurf3exgznm3jbmajvyt3y" , LandingPageURI= "https://rough-cloud-494f.joabichou788.workers.dev/"),
    ExampleFacilityInfo(Name="Helios One Solar Array", SectorType="Solar Power Plant", ContractsSigned=[0,1,1,1,1] ,Location="Blythe, California, USA",Logo_IPFS="bafkreicfooqmktayamd3pxpei6hkxho7xcmnijbrk7hbcusl6reveix2iu", min_response_interval=30*60 , LandingPageURI= "https://yellow-moon-983c.joabichou788.workers.dev/"),
    ExampleFacilityInfo(Name="Northwind Ridge Wind Farm", SectorType="Wind Farm",ContractsSigned=[0,1,1,0,0] , Location="Aberdeenshire, Scotland, UK", Logo_IPFS= "bafkreicb4kweu2xunaz3m3aipm7qwmlnkirxvulvl3ntwyjnkairus6h5y", LandingPageURI= "https://little-leaf-c0be.joabichou788.workers.dev/"),
    ExampleFacilityInfo(Name="PetroNova Refinery B", SectorType="Chemical / Petrochemical Plant",ContractsSigned=[0,1,1,0,0] , Location="Rotterdam, Netherlands", Logo_IPFS= "bafkreifk7k75f72qomcjzk56bwab4l73gwxli2sgybscowc7upmstyiroq", LandingPageURI= "https://orange-lake-5d55.joabichou788.workers.dev/"),
    ExampleFacilityInfo(Name="AquaPure Treatment Works", SectorType="Water Treatment Plant",ContractsSigned=[0,1,1,0,0] , Location="Singapore", Logo_IPFS= "bafkreih7v7b57qnv4pvfoayuzzegjwa567jlcalws45yskkaeiidhrp54m", LandingPageURI= "https://sparkling-cell-ccc2.joabichou788.workers.dev/"),
    ExampleFacilityInfo(Name="OrbitalNet Constellation", SectorType="Satellite",ContractsSigned=[0,1,1,1,1] , Location="Low Earth Orbit (Ground: Luxembourg)" , Logo_IPFS= "bafkreiaxltukwkda3ztyhdzen3iahfpad2opskl56pva2ipnuftlm3u5pu", LandingPageURI= "https://small-forest-a5ea.joabichou788.workers.dev/"),
    ExampleFacilityInfo(Name="VitalCare ICU Wing", SectorType="Hospital Critical Care",ContractsSigned=[0,1,1,0,0] , Location="Boston, Massachusetts, USA" , Logo_IPFS= "bafkreign4jxo244jea6vj3gpyvt4y65hawbyu4bhmcflfmmpb2x7plttde" , LandingPageURI= "https://sweet-smoke-0ff1.joabichou788.workers.dev/"),
    ExampleFacilityInfo(Name="QuantaRing Synchrotron", SectorType="Particle Accelerator", ContractsSigned=[0,1,1,1,1] , Location="Grenoble, France" , Logo_IPFS= "bafkreih6nte2y3uuwjt3nvj76qtb4vccyvhl5knbm27faafq7yy6jfc6im", min_response_interval=60*60, LandingPageURI = "https://damp-grass-ccff.joabichou788.workers.dev/"),
]